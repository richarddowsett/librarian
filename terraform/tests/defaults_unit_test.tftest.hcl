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
    condition     = aws_rds_cluster.aurora_postgres.database_name == "librarian"
    error_message = "Aurora PostgreSQL database name should be librarian"
  }

  assert {
    condition     = aws_budgets_budget.monthly_limit.limit_amount == "13"
    error_message = "Budget limit resource should reflect configured budget amount"
  }
}
