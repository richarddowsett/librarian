# ------------------------------------------------------------------------------
# Output Values: GCP Project & Infrastructure Resources
# ------------------------------------------------------------------------------

output "gcp_project_id" {
  description = "The Google Cloud Project ID."
  value       = local.project_id
}

output "firestore_database_name" {
  description = "Name of the provisioned Firestore Native database."
  value       = google_firestore_database.database.name
}

output "bookshelf_uploads_bucket" {
  description = "Name of the GCS bucket storing bookshelf photo uploads."
  value       = google_storage_bucket.bookshelf_uploads.name
}

output "gemini_api_key_secret_id" {
  description = "Secret ID of the Gemini API Key in Secret Manager."
  value       = google_secret_manager_secret.gemini_api_key.secret_id
}
