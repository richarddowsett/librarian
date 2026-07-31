variables {
  aws_region                = "eu-central-1"
  environment               = "dev"
  project_name              = "librarian"
  monthly_budget_limit_usd  = 13.0
  budget_notification_email = "test-alerts@example.com"
}

run "verify_budget_resource_configuration" {
  command = plan

  assert {
    condition     = aws_budgets_budget.monthly_limit.limit_amount == "13"
    error_message = "Monthly budget limit amount should equal 13 USD"
  }

  assert {
    condition     = aws_budgets_budget.monthly_limit.limit_unit == "USD"
    error_message = "Monthly budget limit unit should be USD"
  }

  assert {
    condition     = aws_budgets_budget.monthly_limit.time_unit == "MONTHLY"
    error_message = "Budget time unit should be MONTHLY"
  }

  assert {
    condition     = aws_iam_policy.budget_freeze_policy.name == "librarian-dev-budget-freeze-policy"
    error_message = "Budget freeze policy name should follow project naming conventions"
  }

  assert {
    condition     = length(aws_budgets_budget_action.freeze_on_budget_exceeded) == 1
    error_message = "Budget action should be created when notification email is provided"
  }
}

run "verify_budget_action_disabled_when_no_email" {
  command = plan

  variables {
    budget_notification_email = ""
  }

  assert {
    condition     = length(aws_budgets_budget_action.freeze_on_budget_exceeded) == 0
    error_message = "Budget action should not be created when notification email is empty"
  }
}
