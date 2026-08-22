variables {
  gcp_project_id = "shelfd-506308"
  gcp_region     = "europe-west1"
}

run "verify_default_gcp_configuration" {
  command = plan

  assert {
    condition     = var.gcp_project_id == "shelfd-506308"
    error_message = "Default GCP Project ID should be shelfd-506308"
  }

  assert {
    condition     = var.gcp_region == "europe-west1"
    error_message = "Default GCP region should be europe-west1"
  }
}
