run "verify_invalid_environment_rejection" {
  command = plan

  variables {
    environment = "invalid_environment_name"
  }

  expect_failures = [
    var.environment
  ]
}
