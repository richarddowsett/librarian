# Firestore Database in Native Mode
resource "google_firestore_database" "database" {
  project     = local.project_id
  name        = "(default)"
  location_id = "eur3"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}
