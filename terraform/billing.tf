# ------------------------------------------------------------------------------
# AWS Billing Budget & Automated Hard Freeze Safeguards
# ------------------------------------------------------------------------------

# 1. AWS Budget with Notification Thresholds (80% & 100%)
resource "aws_budgets_budget" "monthly_limit" {
  name              = "${local.name_prefix}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = tostring(var.monthly_budget_limit_usd)
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-07-27_00:00"

  # Email alert at 80% threshold (~$10.40 USD / ~£8.00 GBP)
  dynamic "notification" {
    for_each = var.budget_notification_email != "" ? [80] : []
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_notification_email]
    }
  }

  # Email alert at 100% threshold ($13.00 USD / ~£10.00 GBP)
  dynamic "notification" {
    for_each = var.budget_notification_email != "" ? [100] : []
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_notification_email]
    }
  }
}

# 2. IAM Policy attached to freeze mutation and invocation operations upon 100% budget breach
resource "aws_iam_policy" "budget_freeze_policy" {
  name        = "${local.name_prefix}-budget-freeze-policy"
  description = "Restrictive policy attached by AWS Budgets Action when 100% monthly budget limit ($13 USD / ~£10 GBP) is reached."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOperationsOnBudgetExceeded"
        Effect = "Deny"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "s3:PutObject",
          "s3:DeleteObject",
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      }
    ]
  })
}

# 3. IAM Role assumed by AWS Budgets service to execute actions
resource "aws_iam_role" "budgets_execution_role" {
  name = "${local.name_prefix}-budgets-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# 4. Policy allowing Budgets execution role to manage IAM policy attachments
resource "aws_iam_role_policy" "budgets_execution_policy" {
  name = "${local.name_prefix}-budgets-execution-policy"
  role = aws_iam_role.budgets_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

# 5. Automated Budget Action to apply freeze policy when 100% threshold is reached
resource "aws_budgets_budget_action" "freeze_on_budget_exceeded" {
  count = var.budget_notification_email != "" ? 1 : 0

  budget_name        = aws_budgets_budget.monthly_limit.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budgets_execution_role.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.budget_freeze_policy.arn
      roles = [
        aws_iam_role.books_lambda_role.name,
        aws_iam_role.series_lambda_role.name,
        aws_iam_role.user_series_status_lambda_role.name,
        aws_iam_role.open_library_lambda_role.name,
        aws_iam_role.authenticated.name
      ]
    }
  }

  subscriber {
    address           = var.budget_notification_email
    subscription_type = "EMAIL"
  }

  depends_on = [
    aws_iam_role_policy.budgets_execution_policy
  ]
}
