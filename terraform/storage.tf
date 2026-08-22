# Cloud Storage Bucket for Bookshelf AI Uploads
resource "google_storage_bucket" "bookshelf_uploads" {
  name                        = "${local.project_id}-bookshelf-uploads"
  location                    = local.region
  force_destroy               = true
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.storage]
}
