# Infrastructure as Code (IaC) - Librarian App (AWS)

This directory contains the HashiCorp Terraform configuration for provisioning the AWS cloud infrastructure required for the **Librarian** application.

## 🏛️ Infrastructure Architecture

The Terraform scripts automate the provisioning and configuration of:
- **AWS Cognito Authentication**: User Pool, User Pool Client, Hosted UI Domain, and Identity Pool for passwordless and federated authentication.
- **Amazon RDS Aurora Serverless v2 PostgreSQL**:
  - Auto-scaling relational cluster (`0.5` - `2.0` ACUs) with normalized SQL schema (`books`, `user_books`, `user_series_status`).
  - Global book catalog deduplication by `isbn`.
  - Native PostgreSQL `TEXT[]` arrays for authors and categories.
- **AWS Secrets Manager**: Secure storage for Aurora database credentials (`aurora-db-credentials`) and Google Books API Key (`google-books-api-key`).
- **AWS Lambda & API Gateway v2**: Node.js 20 microservices with Secrets Manager access for secure PostgreSQL connection pooling and Google Books API proxying.
- **AWS CloudFront & S3**: Global SPA web application hosting and CDN distribution.
- **AWS WAF (Web Application Firewall)**: Regional Web ACL enforcing IP rate-limiting and AWS Managed Common Rule Sets.

---

## 📁 Directory Layout

```
terraform/
├── versions.tf               # Terraform version and required AWS provider & S3 backend
├── variables.tf              # Input variable definitions
├── main.tf                   # Core local variables & infrastructure imports
├── auth.tf                   # Cognito User Pool, Client, and IAM roles
├── database.tf               # Amazon Aurora Serverless v2 PostgreSQL cluster & Secrets Manager
├── backend.tf                # Lambda functions, IAM execution roles & API Gateway routes
├── frontend.tf               # S3 bucket, CloudFront OAC, and CDN distribution
├── outputs.tf                # Infrastructure output values (Cognito IDs, Aurora endpoint, Secret ARNs)
└── README.md                 # Infrastructure deployment documentation
```

---

## 📋 Prerequisites

Before deploying the infrastructure, ensure you have installed and configured:
1. **Terraform**: `v1.5.0` or higher (`terraform -version`).
2. **AWS CLI (`aws`)**: Authenticated with administrator credentials for your AWS account (`aws configure`).
3. **Flyway CLI**: `v10.0.0` or higher (`flyway -v`).

---

## 🚀 Deployment Instructions

### 1. Initialize Working Directory
```bash
cd terraform
terraform init
```

### 2. Validate Configuration
```bash
terraform validate
```

### 3. Provision Infrastructure
```bash
terraform apply
```

### 4. Run Flyway Database Migrations
After Terraform provisions the Aurora PostgreSQL cluster and Secrets Manager credentials, execute Flyway migrations to create the schema:
```bash
flyway -url="jdbc:postgresql://<AURORA_ENDPOINT>:5432/librarian" \
       -user="librarian_admin" \
       -password="<DB_PASSWORD>" \
       -locations="filesystem:../backend/migrations" \
       migrate
```

---

## 🔒 Security & Access Control

### Isolation & Scalability Guarantees:
- **Relational Deduplication**: Books are deduplicated globally in the `books` catalog table by `isbn`. User library links and ratings are isolated in the `user_books` table by `user_id` (Cognito `sub`).
- **Zero API Key Exposure**: Frontend queries backend API Gateway endpoints. The Google Books API key is fetched securely from AWS Secrets Manager on the backend.
- **Edge Protection**: AWS WAF enforces rate limiting (default 2000 requests / 5 min per IP) and AWS Managed Common Rule Set protection.
