# ------------------------------------------------------------------------------
# AWS WAF & Security Controls
# ------------------------------------------------------------------------------

# 1. AWS WAF (Web Application Firewall) for Edge Protection
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name_prefix}-waf-acl"
  description = "WAF Web ACL for rate-limiting and bot protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit-metric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-common-rules-metric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf-metric"
    sampled_requests_enabled   = true
  }
}

# ------------------------------------------------------------------------------
# Bookshelf AI Scanner - Upload Storage Bucket
# ------------------------------------------------------------------------------

# 1. S3 Bucket for Storing User Uploaded Bookshelf Images
resource "aws_s3_bucket" "bookshelf_uploads" {
  bucket        = "${local.name_prefix}-bookshelf-uploads"
  force_destroy = true
}

# 2. CORS Configuration for Direct S3 Presigned URL Uploads
resource "aws_s3_bucket_cors_configuration" "bookshelf_uploads" {
  bucket = aws_s3_bucket.bookshelf_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "POST", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# 3. Lifecycle Rule for Auto-Deleting Uploaded Images After 1 Day
resource "aws_s3_bucket_lifecycle_configuration" "bookshelf_uploads" {
  bucket = aws_s3_bucket.bookshelf_uploads.id

  rule {
    id     = "auto-delete-after-1-day"
    status = "Enabled"

    filter {}

    expiration {
      days = 1
    }
  }
}

# 4. Block Public Access Controls
resource "aws_s3_bucket_public_access_block" "bookshelf_uploads" {
  bucket = aws_s3_bucket.bookshelf_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

