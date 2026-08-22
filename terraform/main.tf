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
