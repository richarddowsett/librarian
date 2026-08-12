# ------------------------------------------------------------------------------
# Serverless Backend: AWS Lambda Functions & API Gateway v2 (HTTP API)
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

data "archive_file" "google_books_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/googleBooks.js"
  output_path = "${path.module}/build/googleBooks.zip"
}

data "archive_file" "bookshelf_ai_lambda" {
  depends_on  = [terraform_data.build_backend]
  type        = "zip"
  source_file = "${path.module}/../backend/dist/handlers/bookshelfAi.js"
  output_path = "${path.module}/build/bookshelfAi.zip"
}


# Standard Lambda AssumeRole Policy Document
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

# --- 1. Books Database Lambda & IAM Role ---
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
  description = "Scoped DynamoDB permissions for Books Lambda to access users, books catalog, and user_library tables"

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
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/index/*",
          aws_dynamodb_table.books.arn,
          "${aws_dynamodb_table.books.arn}/index/*",
          aws_dynamodb_table.user_library.arn,
          "${aws_dynamodb_table.user_library.arn}/index/*"
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
      USERS_TABLE_NAME        = aws_dynamodb_table.users.name
      BOOKS_TABLE_NAME        = aws_dynamodb_table.books.name
      USER_LIBRARY_TABLE_NAME = aws_dynamodb_table.user_library.name
    }
  }
}

# --- 2. Series Database Lambda & IAM Role ---
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

# --- 3. User Series Status Database Lambda & IAM Role ---
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

# --- 4. OpenLibrary Proxy Lambda & IAM Role ---
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

# --- 4b. Google Books Proxy Lambda & IAM Role ---
resource "aws_iam_role" "google_books_lambda_role" {
  name               = "${local.name_prefix}-google-books-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "google_books_lambda_basic" {
  role       = aws_iam_role.google_books_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "google_books_secrets_policy" {
  name        = "${local.name_prefix}-google-books-secrets-policy"
  description = "Allows Google Books Lambda to read API key from Secrets Manager"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "google_books_lambda_secrets" {
  role       = aws_iam_role.google_books_lambda_role.name
  policy_arn = aws_iam_policy.google_books_secrets_policy.arn
}

resource "aws_lambda_function" "google_books" {
  filename         = data.archive_file.google_books_lambda.output_path
  source_code_hash = data.archive_file.google_books_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-google-books-service"
  role             = aws_iam_role.google_books_lambda_role.arn
  handler          = "googleBooks.handler"
  runtime          = "nodejs20.x"
  timeout          = 15
}

# --- 4c. Bedrock Content Guardrail for Bookshelf AI Scanner ---
resource "aws_bedrock_guardrail" "bookshelf_guardrail" {
  name                      = "${local.name_prefix}-bookshelf-guardrail"
  description               = "Bedrock content guardrail for Bookshelf AI Scanner"
  blocked_input_messaging   = "Image scan rejected: The provided content does not appear to be a bookshelf or book collection."
  blocked_outputs_messaging = "Response blocked due to content guardrail policy."

  content_policy_config {
    filters_config {
      type            = "SEXUAL"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "VIOLENCE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "HATE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "MISCONDUCT"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }
  }

  topic_policy_config {
    topics_config {
      name       = "non_bookshelf_content"
      definition = "Content or queries unrelated to books, bookshelves, libraries, or book spines."
      type       = "DENY"
      examples = [
        "How do I repair a car engine?",
        "Pictures of non-book objects or unrelated subjects"
      ]
    }
  }
}

resource "aws_bedrock_guardrail_version" "bookshelf_guardrail" {
  guardrail_arn = aws_bedrock_guardrail.bookshelf_guardrail.guardrail_arn
  description   = "Initial version of bookshelf scanner guardrail"
}

# --- 4d. Bookshelf AI Scanner Lambda & IAM Role ---
resource "aws_iam_role" "bookshelf_ai_lambda_role" {
  name               = "${local.name_prefix}-bookshelf-ai-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "bookshelf_ai_lambda_basic" {
  role       = aws_iam_role.bookshelf_ai_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "bookshelf_ai_policy" {
  name        = "${local.name_prefix}-bookshelf-ai-policy"
  description = "Bedrock model/guardrail and S3 bucket access policy for Bookshelf AI Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:ApplyGuardrail"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-*",
          "arn:aws:bedrock:*:*:foundation-model/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          aws_bedrock_guardrail.bookshelf_guardrail.guardrail_arn,
          "*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.bookshelf_uploads.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bookshelf_ai_lambda_permissions" {
  role       = aws_iam_role.bookshelf_ai_lambda_role.name
  policy_arn = aws_iam_policy.bookshelf_ai_policy.arn
}

resource "aws_lambda_function" "bookshelf_ai" {
  filename         = data.archive_file.bookshelf_ai_lambda.output_path
  source_code_hash = data.archive_file.bookshelf_ai_lambda.output_base64sha256
  function_name    = "${local.name_prefix}-bookshelf-ai-service"
  role             = aws_iam_role.bookshelf_ai_lambda_role.arn
  handler          = "bookshelfAi.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      BOOKSHELF_BUCKET_NAME     = aws_s3_bucket.bookshelf_uploads.id
      BOOKSHELF_UPLOAD_BUCKET   = aws_s3_bucket.bookshelf_uploads.id
      BEDROCK_MODEL_ID          = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
      BEDROCK_GUARDRAIL_ID      = aws_bedrock_guardrail.bookshelf_guardrail.guardrail_id
      BEDROCK_GUARDRAIL_VERSION = aws_bedrock_guardrail_version.bookshelf_guardrail.version
    }
  }
}


# --- 5. AWS API Gateway v2 (HTTP API) & Cognito JWT Authorizer ---
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

# --- 6. API Gateway Integrations ---
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

resource "aws_apigatewayv2_integration" "google_books" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.google_books.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "bookshelf_ai" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.bookshelf_ai.invoke_arn
  payload_format_version = "2.0"
}


# --- 7. API Gateway Routes ---
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

resource "aws_apigatewayv2_route" "google_books_lookup" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /google-books/lookup"
  target             = "integrations/${aws_apigatewayv2_integration.google_books.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "google_books_author_catalog" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /google-books/author-catalog"
  target             = "integrations/${aws_apigatewayv2_integration.google_books.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "google_books_series_catalog" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /google-books/series-catalog"
  target             = "integrations/${aws_apigatewayv2_integration.google_books.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "bookshelf_presigned_url" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /bookshelf/presigned-url"
  target             = "integrations/${aws_apigatewayv2_integration.bookshelf_ai.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookshelf_analyze" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /bookshelf/analyze"
  target             = "integrations/${aws_apigatewayv2_integration.bookshelf_ai.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}


# --- 8. Lambda Invocation Permissions for API Gateway ---
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

resource "aws_lambda_permission" "api_gateway_google_books" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.google_books.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_bookshelf_ai" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bookshelf_ai.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

