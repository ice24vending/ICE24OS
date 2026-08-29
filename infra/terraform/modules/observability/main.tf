variable "environment" {
  type = string
}

variable "otlp_endpoint" {
  type      = string
  sensitive = true
  default   = null
  nullable  = true
}

output "runtime_environment" {
  value = {
    OTEL_ENABLED                = var.otlp_endpoint == null ? "false" : "true"
    OTEL_EXPORTER_OTLP_ENDPOINT = var.otlp_endpoint
    OTEL_SERVICE_NAMESPACE      = "ice24-os"
    DEPLOYMENT_ENVIRONMENT      = var.environment
  }
  sensitive = true
}

output "dashboard" {
  value = "infra/observability/dashboard.json"
}
