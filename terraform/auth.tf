# ------------------------------------------------------------------------------
# AWS Cognito Authentication & IAM Role Isolation
# ------------------------------------------------------------------------------

# 1. AWS Cognito User Pool (Email Sign-in, Custom HTML Email Templates)
resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 5
      max_length = 255
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Welcome to Librarian 📚 - Verify Your Account"
    email_message        = <<EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 30px 15px; }
    .card { max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 36px 28px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); text-align: center; }
    .badge { width: 56px; height: 56px; background-color: #0284c7; border-radius: 16px; margin: 0 auto 16px auto; line-height: 56px; font-size: 28px; }
    .brand { color: #f8fafc; font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
    .tagline { color: #94a3b8; font-size: 13px; margin-bottom: 28px; }
    .prompt { color: #cbd5e1; font-size: 15px; line-height: 1.5; margin-bottom: 20px; text-align: left; }
    .code-container { background-color: #0f172a; border: 2px solid #0284c7; border-radius: 14px; padding: 18px; margin: 24px 0; }
    .code-text { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
    .footer { color: #64748b; font-size: 12px; margin-top: 28px; border-top: 1px solid #334155; padding-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">📚</div>
    <div class="brand">LIBRARIAN</div>
    <div class="tagline">Personal Book Catalog & Series Tracker</div>

    <p class="prompt">
      Welcome to Librarian! Use the 6-digit verification code below to confirm your email and complete your account setup:
    </p>

    <div class="code-container">
      <div class="code-text">{####}</div>
    </div>

    <p style="color: #94a3b8; font-size: 13px; text-align: left; margin: 0;">
      If you did not request account creation, you can safely ignore this email message.
    </p>

    <div class="footer">
      &copy; Librarian App &bull; Powered by AWS Cognito & Cloud Infrastructure
    </div>
  </div>
</body>
</html>
EOF
  }
}

# 2. Cognito User Pool App Client
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["https://localhost:8081/callback", "librarian://callback"]
  logout_urls                          = ["https://localhost:8081/logout", "librarian://logout"]
  supported_identity_providers         = ["COGNITO"]
}

# 3. Cognito Hosted UI Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

# 4. Cognito Identity Pool for AWS Resource Access
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = replace("${local.name_prefix}-identity-pool", "-", "_")
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.web.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

# 5. Authenticated User IAM Role
resource "aws_iam_role" "authenticated" {
  name = "${local.name_prefix}-authenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

# 6. Unauthenticated (Guest) IAM Role
resource "aws_iam_role" "unauthenticated" {
  name = "${local.name_prefix}-unauthenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })
}

# 7. Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated   = aws_iam_role.authenticated.arn
    unauthenticated = aws_iam_role.unauthenticated.arn
  }
}

# 8. IAM Policy for Authenticated Cognito Users to invoke API Gateway
resource "aws_iam_policy" "api_user_access" {
  name        = "${local.name_prefix}-api-user-access"
  description = "Allows authenticated Cognito users to execute API Gateway endpoints"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "execute-api:Invoke"
        ]
        Resource = [
          "${aws_apigatewayv2_api.main.execution_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "authenticated_api" {
  role       = aws_iam_role.authenticated.name
  policy_arn = aws_iam_policy.api_user_access.arn
}
