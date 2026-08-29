variable "environment" {
  type = string
}

locals {
  required_secret_names = toset([
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DATABASE_PASSWORD",
    "VERCEL_API_TOKEN",
    "OTEL_EXPORTER_OTLP_HEADERS",
  ])
}

output "required_secret_names" {
  description = "Secret names only. Values must be supplied by protected environment stores."
  value       = local.required_secret_names
}

output "rotation_days" {
  value = var.environment == "production" ? 90 : 180
}
