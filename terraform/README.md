# Infrastructure as Code (IaC) - Librarian App (AWS)

This directory contains the HashiCorp Terraform configuration for provisioning the AWS cloud infrastructure required for the **Librarian** application.

## 🏛️ Infrastructure Architecture

The Terraform scripts automate the provisioning and configuration of:
- **AWS Cognito Authentication**: User Pool, User Pool Client, Hosted UI Domain, and Identity Pool for passwordless and federated authentication (Google & Apple).
- **IAM Fine-Grained Access Control (FGAC)**: Configures authenticated and unauthenticated roles with strict DynamoDB row-level access control (`dynamodb:LeadingKeys` matching `${cognito-identity.amazonaws.com:sub}`).
- **AWS DynamoDB Databases**:
  - `librarian-books`: Per-user book catalog storage with `ownerId` partition key, `id` sort key, and GSI on `isbn`.
  - `librarian-series`: Read-only series metadata catalog.
  - `librarian-user-series-status`: User series tracking data with `userId` partition key and `seriesId` sort key.
- **AWS WAF (Web Application Firewall)**: Regional Web ACL enforcing IP rate-limiting and AWS Managed Common Rule Sets (replacing Firebase App Check).

---

## 📁 Directory Layout

```
terraform/
├── versions.tf               # Terraform version and required AWS provider & S3 backend
├── variables.tf              # Input variable definitions (alphabetical)
├── main.tf                   # Primary AWS resource definitions (Cognito, IAM, DynamoDB, WAF)
├── outputs.tf                 # Output values (Cognito User Pool ID, Identity Pool ID, Table names)
├── terraform.tfvars.example  # Example values for environment variables
├── .env.example              # Template for client application environment variables
└── README.md                 # Infrastructure deployment documentation
```

---

## 📋 Prerequisites

Before deploying the infrastructure, ensure you have installed and configured:
1. **Terraform**: `v1.5.0` or higher (`terraform -version`).
2. **AWS CLI (`aws`)**: Authenticated with administrator credentials for your AWS account.
   ```bash
   aws configure
   ```
3. **AWS Account**: An active AWS account with sufficient permissions for IAM, Cognito, DynamoDB, and WAF.

---

## 🚀 Deployment Instructions

### 1. Remote S3 Backend Configuration
The Terraform configuration is set up to store remote state in an S3 bucket with native S3 state locking (`versions.tf`):
```hcl
terraform {
  backend "s3" {
    bucket       = "librarian-terraform-state"
    key          = "terraform/state/terraform.tfstate"
    region       = "eu-central-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

If the state bucket needs to be created:
```bash
aws s3api create-bucket --bucket librarian-terraform-state --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1
```

### 2. Initialize Working Directory
Navigate to the `terraform/` directory and run:
```bash
cd terraform
terraform init
```

### 3. Configure Environment Variables
Copy the example variables file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region     = "eu-central-1"
environment    = "dev"
project_name   = "librarian"
waf_rate_limit = 2000

# Optional: Google / Apple OAuth 2.0 Credentials
google_client_id     = ""
google_client_secret = ""
apple_client_id      = ""
```

### 4. Validate Configuration
Format and validate the Terraform code:
```bash
terraform fmt -recursive
terraform validate
```

### 5. Review Execution Plan
Generate and inspect an execution plan before applying changes:
```bash
terraform plan
```

### 6. Provision Infrastructure
Apply the configuration to deploy resources:
```bash
terraform apply
```
Review the proposed changes and type `yes` when prompted.

---

## 🔑 Exporting Configuration to Application `.env`

Once `terraform apply` finishes successfully, copy `terraform/.env.example` to `.env` in your project root and update it with the values from `terraform output`:

```env
EXPO_PUBLIC_AWS_REGION=eu-central-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=<value from terraform output cognito_user_pool_id>
EXPO_PUBLIC_COGNITO_CLIENT_ID=<value from terraform output cognito_user_pool_client_id>
EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID=<value from terraform output cognito_identity_pool_id>
EXPO_PUBLIC_COGNITO_DOMAIN=<value from terraform output cognito_user_pool_domain>
EXPO_PUBLIC_DYNAMODB_BOOKS_TABLE=<value from terraform output dynamodb_table_books>
EXPO_PUBLIC_DYNAMODB_SERIES_TABLE=<value from terraform output dynamodb_table_series>
EXPO_PUBLIC_DYNAMODB_SERIES_STATUS_TABLE=<value from terraform output dynamodb_table_user_series_status>
```

---

## 🔒 Security & Access Control

### Isolation Guarantees:
- **IAM Fine-Grained Access Control (FGAC)**: Access to DynamoDB table rows strictly requires the partition key (`ownerId` or `userId`) to match `${cognito-identity.amazonaws.com:sub}`.
- **Edge Protection**: AWS WAF enforces rate limiting (default 2000 requests / 5 min per IP) and AWS Managed Common Rule Set protection against common web exploit vectors.
- **Data Encryption**: All DynamoDB tables enforce server-side encryption and point-in-time recovery (PITR).

---

## 🧹 Tearing Down Infrastructure

To destroy all provisioned infrastructure (caution: deletes tables and auth user pool):
```bash
terraform destroy
```
