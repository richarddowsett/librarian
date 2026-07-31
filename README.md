# 📚 Librarian Application

A comprehensive book library and series management application supporting barcode scanning, manual entry, series tracking, deduplicated catalog management, and cloud syncing.

---

## 🏗️ Architecture & Project Structure

- **`app/`**: Expo / React Native mobile & web client application with NativeWind styling and navigation.
- **`backend/`**: Node.js microservices, Google Books API proxy, PostgreSQL connection pooling, and Flyway SQL migrations (`backend/migrations`).
- **`terraform/`**: HashiCorp Terraform configurations for AWS Cognito, Amazon Aurora Serverless v2 PostgreSQL, Secrets Manager, IAM security policies, and CloudFront hosting.
- **`docs-site/`**: Application documentation, architecture guides, and user manuals.

---

## ⚡ Quick Start: AWS Infrastructure Deployment

### Prerequisites:
- AWS CLI configured (`aws configure`)
- Terraform (`>= 1.5.0`)
- Node.js (`>= 20.0.0`)
- Flyway CLI (`>= 10.0.0`) for database schema migrations

### 1. Initialize & Provision AWS Infrastructure:
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Configure Environment Variables & Flyway Database Migration:
Copy `.env.example` to `.env` and set your desired database credentials. Run Flyway migration:
```bash
flyway -url="jdbc:postgresql://<AURORA_ENDPOINT>:5432/librarian" -user="librarian_admin" -password="<PASSWORD>" -locations="filesystem:backend/migrations" migrate
```

---

## 📖 Documentation

- ☁️ **AWS Terraform IaC Configuration**: [terraform/README.md](file:///Users/richarddowsett/development/librarian/terraform/README.md)
