variables {
  aws_region   = "eu-central-1"
  environment  = "dev"
  project_name = "librarian"
}

run "verify_modular_infrastructure_resources" {
  command = plan

  # Auth module assertion
  assert {
    condition     = aws_cognito_user_pool.main.name == "librarian-dev-user-pool"
    error_message = "Cognito User Pool name should match expected naming convention"
  }

  # Database module assertion
  assert {
    condition     = aws_dynamodb_table.books.name == "librarian-dev-books"
    error_message = "Books DynamoDB table name should match expected naming convention"
  }

  assert {
    condition     = aws_dynamodb_table.series.name == "librarian-dev-series"
    error_message = "Series DynamoDB table name should match expected naming convention"
  }

  # Storage/WAF assertion
  assert {
    condition     = aws_wafv2_web_acl.main.name == "librarian-dev-waf-acl"
    error_message = "WAF Web ACL name should match expected naming convention"
  }

  # Backend module assertion
  assert {
    condition     = aws_apigatewayv2_api.main.name == "librarian-dev-http-api"
    error_message = "API Gateway name should match expected naming convention"
  }

  # Frontend module assertion
  assert {
    condition     = aws_s3_bucket.frontend.bucket == "librarian-dev-frontend-bucket"
    error_message = "Frontend S3 bucket name should match expected naming convention"
  }

  # Billing module assertion
  assert {
    condition     = aws_budgets_budget.monthly_limit.name == "librarian-dev-monthly-budget"
    error_message = "Budget resource name should match expected naming convention"
  }
}
