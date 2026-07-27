# Local configurations and naming conventions
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ------------------------------------------------------------------------------
# 1. AWS Cognito Authentication (User Pool & Identity Pool)
# ------------------------------------------------------------------------------

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

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = replace("${local.name_prefix}-identity-pool", "-", "_")
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.web.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

# ------------------------------------------------------------------------------
# 2. IAM Roles & Fine-Grained Access Control (FGAC) for DynamoDB Isolation
# ------------------------------------------------------------------------------

# Authenticated User IAM Role
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

# Unauthenticated (Guest) IAM Role
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

# Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated   = aws_iam_role.authenticated.arn
    unauthenticated = aws_iam_role.unauthenticated.arn
  }
}

# Fine-Grained Access Control (FGAC) Policy for User Data Isolation in DynamoDB
resource "aws_iam_policy" "dynamodb_user_isolation" {
  name        = "${local.name_prefix}-dynamodb-user-isolation"
  description = "Enforces strict user isolation using DynamoDB LeadingKeys matching Cognito sub"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.books.arn,
          "${aws_dynamodb_table.books.arn}/index/*",
          aws_dynamodb_table.user_series_status.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.series.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "authenticated_dynamodb" {
  role       = aws_iam_role.authenticated.name
  policy_arn = aws_iam_policy.dynamodb_user_isolation.arn
}

# ------------------------------------------------------------------------------
# 3. AWS DynamoDB Databases
# ------------------------------------------------------------------------------

# Books Table (User Isolation via ownerId as Partition Key)
resource "aws_dynamodb_table" "books" {
  name         = "${local.name_prefix}-books"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ownerId"
  range_key    = "id"

  attribute {
    name = "ownerId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "isbn"
    type = "S"
  }

  global_secondary_index {
    name            = "isbn-index"
    hash_key        = "isbn"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# Series Metadata Table (Shared Read-Only Reference Data)
resource "aws_dynamodb_table" "series" {
  name         = "${local.name_prefix}-series"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# User Series Status Table (User Isolation via userId as Partition Key)
resource "aws_dynamodb_table" "user_series_status" {
  name         = "${local.name_prefix}-user-series-status"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "seriesId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "seriesId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# ------------------------------------------------------------------------------
# 4. AWS WAF (Web Application Firewall) for Edge Protection
# ------------------------------------------------------------------------------

resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name_prefix}-waf-acl"
  description = "WAF Web ACL for rate-limiting and bot protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-metric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-common-rules-metric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf-metric"
    sampled_requests_enabled   = true
  }
}

# ------------------------------------------------------------------------------
# 5. AWS Lambda Backend Functions & Isolated IAM Roles Per Database
# ------------------------------------------------------------------------------

# Automatically build backend handlers before creating Zip archives
resource "terraform_data" "build_backend" {
  triggers_replace = [
    filesha256("${path.module}/../backend/package.json"),
    filesha256("${path.module}/../backend/build.js")
  ]

  provisioner "local-exec" {
    working_dir = "${path.module}/../backend"
    command     = "npm run build"
  }
}

# Archive backend handler files into Zip archives for Lambda deployment
data "archive_file" "books_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/books.js"
  output_path = "${path.module}/build/books.zip"
}

data "archive_file" "series_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/series.js"
  output_path = "${path.module}/build/series.zip"
}

data "archive_file" "user_series_status_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/userSeriesStatus.js"
  output_path = "${path.module}/build/userSeriesStatus.zip"
}

data "archive_file" "open_library_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/openLibrary.js"
  output_path = "${path.module}/build/openLibrary.zip"
}


# Standard Lambda AssumeRole Policy
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Books Database Lambda & Role ---
resource "aws_iam_role" "books_lambda_role" {
  name               = "${local.name_prefix}-books-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "books_lambda_basic" {
  role       = aws_iam_role.books_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "books_table_policy" {
  name        = "${local.name_prefix}-books-table-policy"
  description = "Scoped DynamoDB permissions for Books Lambda to access books table ONLY"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.books.arn,
          "${aws_dynamodb_table.books.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "books_lambda_db" {
  role       = aws_iam_role.books_lambda_role.name
  policy_arn = aws_iam_policy.books_table_policy.arn
}

resource "aws_lambda_function" "books" {
  filename         = data.archive_file.books_lambda.output_path
  source_code_hash = data.archive_file.books_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-books-service"
  role             = aws_iam_role.books_lambda_role.arn
  handler          = "books.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      BOOKS_TABLE_NAME = aws_dynamodb_table.books.name
    }
  }
}

# --- Series Database Lambda & Role ---
resource "aws_iam_role" "series_lambda_role" {
  name               = "${local.name_prefix}-series-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "series_lambda_basic" {
  role       = aws_iam_role.series_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "series_table_policy" {
  name        = "${local.name_prefix}-series-table-policy"
  description = "Scoped DynamoDB permissions for Series Lambda to access series table ONLY"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.series.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "series_lambda_db" {
  role       = aws_iam_role.series_lambda_role.name
  policy_arn = aws_iam_policy.series_table_policy.arn
}

resource "aws_lambda_function" "series" {
  filename         = data.archive_file.series_lambda.output_path
  source_code_hash = data.archive_file.series_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-series-service"
  role             = aws_iam_role.series_lambda_role.arn
  handler          = "series.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      SERIES_TABLE_NAME = aws_dynamodb_table.series.name
    }
  }
}

# --- User Series Status Database Lambda & Role ---
resource "aws_iam_role" "user_series_status_lambda_role" {
  name               = "${local.name_prefix}-user-series-status-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "user_series_status_lambda_basic" {
  role       = aws_iam_role.user_series_status_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "user_series_status_table_policy" {
  name        = "${local.name_prefix}-user-series-status-table-policy"
  description = "Scoped DynamoDB permissions for UserSeriesStatus Lambda to access user_series_status table ONLY"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.user_series_status.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "user_series_status_lambda_db" {
  role       = aws_iam_role.user_series_status_lambda_role.name
  policy_arn = aws_iam_policy.user_series_status_table_policy.arn
}

resource "aws_lambda_function" "user_series_status" {
  filename         = data.archive_file.user_series_status_lambda.output_path
  source_code_hash = data.archive_file.user_series_status_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-user-series-status-service"
  role             = aws_iam_role.user_series_status_lambda_role.arn
  handler          = "userSeriesStatus.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      USER_SERIES_STATUS_TABLE_NAME = aws_dynamodb_table.user_series_status.name
    }
  }
}

# --- OpenLibrary Proxy Lambda & Role ---
resource "aws_iam_role" "open_library_lambda_role" {
  name               = "${local.name_prefix}-open-library-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "open_library_lambda_basic" {
  role       = aws_iam_role.open_library_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "open_library" {
  filename         = data.archive_file.open_library_lambda.output_path
  source_code_hash = data.archive_file.open_library_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-open-library-service"
  role             = aws_iam_role.open_library_lambda_role.arn
  handler          = "openLibrary.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
}

# ------------------------------------------------------------------------------
# 6. AWS API Gateway v2 (HTTP API) & Cognito JWT Authorizer
# ------------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type", "x-user-id"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.name_prefix}-cognito-jwt-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://${aws_cognito_user_pool.main.endpoint}"
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

# --- Integrations ---
resource "aws_apigatewayv2_integration" "books" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.books.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "series" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.series.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "user_series_status" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.user_series_status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "open_library" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.open_library.invoke_arn
  payload_format_version = "2.0"
}

# --- Routes ---
resource "aws_apigatewayv2_route" "books_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /books"
  target             = "integrations/${aws_apigatewayv2_integration.books.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "books_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /books"
  target             = "integrations/${aws_apigatewayv2_integration.books.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "books_get_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /books/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.books.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "books_put_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /books/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.books.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "books_delete_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /books/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.books.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "series_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /series"
  target             = "integrations/${aws_apigatewayv2_integration.series.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "series_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /series"
  target             = "integrations/${aws_apigatewayv2_integration.series.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "series_get_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /series/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.series.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "user_series_status_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /user-series-status"
  target             = "integrations/${aws_apigatewayv2_integration.user_series_status.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "user_series_status_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /user-series-status"
  target             = "integrations/${aws_apigatewayv2_integration.user_series_status.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "user_series_status_get_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /user-series-status/{seriesId}"
  target             = "integrations/${aws_apigatewayv2_integration.user_series_status.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "open_library_lookup" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /open-library/lookup"
  target             = "integrations/${aws_apigatewayv2_integration.open_library.id}"
  authorization_type = "NONE"
}

# --- Lambda Invocation Permissions ---
resource "aws_lambda_permission" "api_gateway_books" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.books.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_series" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.series.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_user_series_status" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_series_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_open_library" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.open_library.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ------------------------------------------------------------------------------
# 7. AWS S3 & CloudFront CDN for Frontend Web App Hosting
# ------------------------------------------------------------------------------

resource "aws_s3_bucket" "frontend" {
  bucket        = "${local.name_prefix}-frontend-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-frontend-oac"
  description                       = "CloudFront OAC for S3 frontend hosting"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CloudFront Distribution for Librarian Frontend SPA"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  # SPA Routing Support: redirect 403 & 404 to index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}


