# 📚 Librarian Application

A comprehensive book library and series management application supporting barcode scanning, manual entry, series tracking, and cloud catalog management.

---

## 🏗️ Architecture & Project Structure

- **`app/`**: Expo / React Native mobile client application with NativeWind styling and navigation.
- **`backend/`**: Node.js backend services and Open Library API integrations.
- **`terraform/`**: HashiCorp Terraform configurations for AWS Cognito, DynamoDB, IAM FGAC rules, and WAF protection.
- **`docs-site/`**: Application documentation and user guides.

---

## ⚡ Quick Start: AWS Infrastructure Deployment

### Prerequisites:
- AWS CLI configured (`aws configure`)
- Terraform (`>= 1.5.0`)
- Node.js (`>= 18.0.0`)

### 1. Initialize & Provision AWS Infrastructure:
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Configure Environment Variables:
Copy [terraform/terraform.tfvars.example](file:///Users/richarddowsett/development/librarian/terraform/terraform.tfvars.example) to `terraform/terraform.tfvars` and set your desired values. After running `terraform apply`, copy the outputs to your `.env` file.

---

## 📖 Documentation

- ☁️ **AWS Terraform IaC Configuration**: [terraform/README.md](file:///Users/richarddowsett/development/librarian/terraform/README.md)
