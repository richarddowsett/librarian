# ------------------------------------------------------------------------------
# Input Variables: Project & Environment Core
# ------------------------------------------------------------------------------

variable "aws_region" {
  description = "The AWS region for provisioning resources."
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Deployment environment name (e.g., dev, staging, prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Name of the project."
  type        = string
  default     = "librarian"
}

# ------------------------------------------------------------------------------
# Input Variables: Auth & Identity (auth.tf)
# ------------------------------------------------------------------------------

variable "apple_client_id" {
  description = "Services ID for Apple Sign-In provider in Cognito."
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_id" {
  description = "OAuth 2.0 Client ID for Google Identity Provider in Cognito User Pool."
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "OAuth 2.0 Client Secret for Google Identity Provider in Cognito User Pool."
  type        = string
  default     = ""
  sensitive   = true
}

# ------------------------------------------------------------------------------
# Input Variables: Edge Security & Storage (storage.tf)
# ------------------------------------------------------------------------------

variable "waf_rate_limit" {
  description = "AWS WAF rate limit threshold per 5-minute evaluation window per IP address."
  type        = number
  default     = 2000
}

# ------------------------------------------------------------------------------
# Input Variables: Billing & Cost Controls (billing.tf)
# ------------------------------------------------------------------------------

variable "monthly_budget_limit_usd" {
  description = "Monthly AWS budget limit in USD ($13 USD is approximately £10 GBP)."
  type        = number
  default     = 13.0
}

variable "budget_notification_email" {
  description = "Email address to receive AWS budget alerts at threshold milestones (e.g. 80% and 100%)."
  type        = string
  default     = ""
}
