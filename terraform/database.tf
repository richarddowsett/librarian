# ------------------------------------------------------------------------------
# Database Infrastructure: Amazon RDS Aurora Serverless v2 PostgreSQL
# ------------------------------------------------------------------------------

resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "aws_secretsmanager_secret" "aurora_db_credentials" {
  name        = "${local.name_prefix}-aurora-db-credentials"
  description = "Aurora Serverless v2 PostgreSQL connection credentials for Librarian App"
}

resource "aws_secretsmanager_secret_version" "aurora_db_credentials" {
  secret_id = aws_secretsmanager_secret.aurora_db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_rds_cluster.aurora_postgres.endpoint
    port     = aws_rds_cluster.aurora_postgres.port
    dbname   = aws_rds_cluster.aurora_postgres.database_name
    username = aws_rds_cluster.aurora_postgres.master_username
    password = random_password.db_password.result
  })
}

resource "aws_security_group" "aurora_sg" {
  name        = "${local.name_prefix}-aurora-sg"
  description = "Security Group for Aurora Serverless v2 PostgreSQL"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_rds_cluster" "aurora_postgres" {
  cluster_identifier      = "${local.name_prefix}-aurora-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "18.4"
  database_name           = "librarian"
  master_username         = "librarian_admin"
  master_password         = random_password.db_password.result
  vpc_security_group_ids = [aws_security_group.aurora_sg.id]
  skip_final_snapshot     = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2.0
  }
}

resource "aws_rds_cluster_instance" "aurora_postgres_instance" {
  cluster_identifier = aws_rds_cluster.aurora_postgres.id
  identifier         = "${local.name_prefix}-aurora-instance-1"
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.aurora_postgres.engine
  engine_version      = aws_rds_cluster.aurora_postgres.engine_version
}
