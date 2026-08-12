# ------------------------------------------------------------------------------
# Output Values: General Project Configuration
# ------------------------------------------------------------------------------

output "aws_region" {
  description = "The AWS region where resources are provisioned."
  value       = var.aws_region
}

# ------------------------------------------------------------------------------
# Output Values: Auth & Identity (auth.tf)
# ------------------------------------------------------------------------------

output "cognito_identity_pool_id" {
  description = "ID of the AWS Cognito Identity Pool."
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "ID of the AWS Cognito User Pool Web Client."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_user_pool_domain" {
  description = "Domain prefix for the AWS Cognito Hosted UI."
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_user_pool_id" {
  description = "ID of the AWS Cognito User Pool."
  value       = aws_cognito_user_pool.main.id
}

# ------------------------------------------------------------------------------
# Output Values: Database Tables (database.tf)
# ------------------------------------------------------------------------------

output "dynamodb_table_books" {
  description = "Name of the DynamoDB Books table."
  value       = aws_dynamodb_table.books.name
}

output "dynamodb_table_series" {
  description = "Name of the DynamoDB Series table."
  value       = aws_dynamodb_table.series.name
}

output "dynamodb_table_user_series_status" {
  description = "Name of the DynamoDB User Series Status table."
  value       = aws_dynamodb_table.user_series_status.name
}

# ------------------------------------------------------------------------------
# Output Values: Security & Edge Protection (storage.tf)
# ------------------------------------------------------------------------------

output "waf_web_acl_arn" {
  description = "ARN of the provisioned AWS WAF Web ACL."
  value       = aws_wafv2_web_acl.main.arn
}

output "bookshelf_uploads_s3_bucket" {
  description = "Name of the S3 bucket storing user uploaded bookshelf images."
  value       = aws_s3_bucket.bookshelf_uploads.id
}

# ------------------------------------------------------------------------------
# Output Values: Serverless Backend (backend.tf)
# ------------------------------------------------------------------------------

output "api_gateway_endpoint" {
  description = "HTTP API Gateway Base URL for the client application."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

# ------------------------------------------------------------------------------
# Output Values: Frontend Hosting & CDN (frontend.tf)
# ------------------------------------------------------------------------------

output "frontend_s3_bucket" {
  description = "Name of the S3 bucket storing frontend SPA assets."
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_url" {
  description = "Live CloudFront HTTPS URL for the frontend application."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for cache invalidations."
  value       = aws_cloudfront_distribution.frontend.id
}

# ------------------------------------------------------------------------------
# Output Values: Billing & Cost Controls (billing.tf)
# ------------------------------------------------------------------------------

output "budget_name" {
  description = "Name of the provisioned AWS Budget."
  value       = aws_budgets_budget.monthly_limit.name
}

output "budget_limit" {
  description = "Configured monthly limit for AWS spend."
  value       = "${aws_budgets_budget.monthly_limit.limit_amount} ${aws_budgets_budget.monthly_limit.limit_unit}"
}
