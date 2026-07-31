# ------------------------------------------------------------------------------
# Librarian Infrastructure - Main Entrypoint & Global Locals
# ------------------------------------------------------------------------------
# Infrastructure components are modularized across domain-specific files:
#   - auth.tf       : AWS Cognito User Pool, Identity Pool, & User IAM Isolation Policies
#   - database.tf   : Amazon Aurora Serverless v2 PostgreSQL & Secrets Manager
#   - storage.tf    : AWS WAF (Web Application Firewall) & Edge Security
#   - backend.tf    : Serverless Lambdas, IAM Roles, & API Gateway v2 (HTTP API)
#   - frontend.tf   : S3 Static Web App Hosting & CloudFront CDN Distribution
#   - billing.tf    : AWS Budgets Cost Controls & Automated Hard Freeze Action
# ------------------------------------------------------------------------------

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}
