output "aws_region" {
  description = "The AWS region where resources are provisioned."
  value       = var.aws_region
}

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

output "waf_web_acl_arn" {
  description = "ARN of the provisioned AWS WAF Web ACL."
  value       = aws_wafv2_web_acl.main.arn
}
