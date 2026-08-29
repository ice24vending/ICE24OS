variable "environment" {
  type = string

  validation {
    condition     = contains(["development", "test", "staging", "production"], var.environment)
    error_message = "environment must be an ICE24 OS deployment environment."
  }
}

locals {
  statement_timeout = contains(["staging", "production"], var.environment) ? "15s" : "30s"
}

output "settings" {
  description = "Supabase database settings managed by the single platform settings resource."
  value = {
    statement_timeout = local.statement_timeout
  }
}

output "required_extensions" {
  value = ["postgis", "pg_cron", "pgmq"]
}

output "ssl_enforcement" {
  value = true
}
