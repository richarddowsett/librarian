variable "apple_client_id" {
  description = "Services ID for Apple Sign-In provider in Cognito."
  type        = string
  default     = ""
  sensitive   = true
}

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

variable "project_name" {
  description = "Name of the project."
  type        = string
  default     = "librarian"
}

variable "waf_rate_limit" {
  description = "AWS WAF rate limit threshold per 5-minute evaluation window per IP address."
  type        = number
  default     = 2000
}
