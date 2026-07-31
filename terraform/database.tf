# ------------------------------------------------------------------------------
# AWS DynamoDB Databases
# ------------------------------------------------------------------------------

# 1. Users Table
resource "aws_dynamodb_table" "users" {
  name         = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# 2. Shared Books Catalog Table (Deduplicated across all users via ISBN index)
resource "aws_dynamodb_table" "books" {
  name         = "${local.name_prefix}-books"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "isbn"
    type = "S"
  }

  global_secondary_index {
    name            = "isbn-index"
    hash_key        = "isbn"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# 3. User Library Junction Table (Many-to-Many relationship between Users and Books)
resource "aws_dynamodb_table" "user_library" {
  name         = "${local.name_prefix}-user-library"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "id"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "bookId"
    type = "S"
  }

  global_secondary_index {
    name            = "bookId-index"
    hash_key        = "bookId"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# 2. Series Metadata Table (Shared Read-Only Reference Data)
resource "aws_dynamodb_table" "series" {
  name         = "${local.name_prefix}-series"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

# 3. User Series Status Table (User Isolation via userId as Partition Key)
resource "aws_dynamodb_table" "user_series_status" {
  name         = "${local.name_prefix}-user-series-status"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "seriesId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "seriesId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
