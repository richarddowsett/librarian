# 🏗️ Shelfd Infrastructure — Google Cloud & Firebase Terraform

Declarative Infrastructure as Code (IaC) for **Shelfd** using the HashiCorp Google provider (`hashicorp/google`).

---

## 📦 Provisioned GCP Resources

* **`google_firestore_database.database`**: Cloud Firestore in Native mode (`shelfd-506308`).
* **`google_storage_bucket.bookshelf_uploads`**: GCS Bucket for Bookshelf AI image uploads.
* **`google_secret_manager_secret.gemini_api_key`**: Secret Manager secret storing the Gemini 2.5 Flash API Key.
* **`google_project_service.*`**: Enables Firestore, Secret Manager, Cloud Storage, Cloud Run, and Firebase APIs.

---

## 🚀 Usage Instructions

1. **Remote State Management (GCS)**:
   Create the GCS state bucket once using `gcloud`:
   ```bash
   gcloud storage buckets create gs://shelfd-506308-tfstate --project=shelfd-506308 --location=europe-west1 --uniform-bucket-level-access
   ```

2. **Initialize Terraform**:
   ```bash
   terraform init
   ```

3. **Plan & Apply Infrastructure**:
   ```bash
   terraform plan
   terraform apply
   ```
