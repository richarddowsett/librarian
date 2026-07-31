variables {
  aws_region   = "eu-central-1"
  environment  = "dev"
  project_name = "librarian"
}

run "verify_default_configuration_and_outputs" {
  command = plan

  assert {
    condition     = var.aws_region == "eu-central-1"
    error_message = "Default AWS region should be eu-central-1"
  }

  assert {
    condition     = var.environment == "dev"
    error_message = "Default environment should be dev"
  }

  assert {
    condition     = aws_cognito_user_pool.main.name == "librarian-dev-user-pool"
    error_message = "Cognito User Pool name prefix should be librarian-dev"
  }

  assert {
    condition     = aws_dynamodb_table.books.billing_mode == "PAY_PER_REQUEST"
    error_message = "DynamoDB Books table should use PAY_PER_REQUEST billing mode for cost efficiency"
  }

  assert {
    condition     = output.budget_limit == "13 USD"
    error_message = "Budget limit output should reflect configured budget amount"
  }
}
