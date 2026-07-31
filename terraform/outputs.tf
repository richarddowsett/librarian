# ------------------------------------------------------------------------------
# Terraform Infrastructure Outputs
# ------------------------------------------------------------------------------

output "api_gateway_endpoint" {
  description = "Public HTTP endpoint for API Gateway v2"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "AWS Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "AWS Cognito User Pool App Client ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_identity_pool_id" {
  description = "AWS Cognito Identity Pool ID for Federated Identities"
  value       = aws_cognito_identity_pool.main.id
}

output "cloudfront_distribution_id" {
  description = "AWS CloudFront Distribution ID for Frontend Hosting"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "AWS CloudFront Distribution Domain Name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "aurora_postgres_endpoint" {
  description = "Amazon Aurora Serverless v2 PostgreSQL Endpoint"
  value       = aws_rds_cluster.aurora_postgres.endpoint
}

output "aurora_db_name" {
  description = "Amazon Aurora PostgreSQL Database Name"
  value       = aws_rds_cluster.aurora_postgres.database_name
}

output "aurora_credentials_secret_arn" {
  description = "AWS Secrets Manager Secret ARN for Aurora Database Credentials"
  value       = aws_secretsmanager_secret.aurora_db_credentials.arn
}
