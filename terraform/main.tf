locals {
  project_id = var.gcp_project_id
  region     = var.gcp_region
}

provider "google" {
  project = local.project_id
  region  = local.region
}

resource "google_project_service" "firestore" {
  project = local.project_id
  service = "firestore.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  project = local.project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  project = local.project_id
  service = "storage-component.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "cloudrun" {
  project = local.project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase" {
  project = local.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebasehosting" {
  project = local.project_id
  service = "firebasehosting.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project = local.project_id
  service = "cloudbuild.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  project = local.project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

data "google_project" "project" {
  project_id = local.project_id
}

resource "google_project_iam_member" "compute_storage_admin" {
  project = local.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "compute_builder" {
  project = local.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "compute_artifact_writer" {
  project = local.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "compute_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_cloud_run_service_iam_member" "noauth" {
  location = local.region
  project  = local.project_id
  service  = "shelfd-backend"
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_project_iam_member" "deployer_run_admin" {
  project = local.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:github-actions-deployer@${local.project_id}.iam.gserviceaccount.com"
}
