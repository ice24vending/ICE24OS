variable "environment" {
  type = string
}

variable "otlp_endpoint" {
  type      = string
  sensitive = true
  default   = null
  nullable  = true
}

# F5-14 (RF-AUD-008, RNF-PER-005): technical integration logs have a configurable retention.
# No period is assumed while PRD question 92 / DEC-008 is open: null keeps every record.
variable "integration_log_retention_days" {
  type        = number
  default     = null
  nullable    = true
  description = "Days to keep infra.integration_logs; null disables the purge task."

  validation {
    condition = var.integration_log_retention_days == null || (
      floor(coalesce(var.integration_log_retention_days, 1)) == coalesce(var.integration_log_retention_days, 1) &&
      coalesce(var.integration_log_retention_days, 1) >= 1 &&
      coalesce(var.integration_log_retention_days, 1) <= 3650
    )
    error_message = "integration_log_retention_days must be an integer between 1 and 3650, or null."
  }
}

output "runtime_environment" {
  value = {
    OTEL_ENABLED                   = var.otlp_endpoint == null ? "false" : "true"
    OTEL_EXPORTER_OTLP_ENDPOINT    = var.otlp_endpoint
    OTEL_SERVICE_NAMESPACE         = "ice24-os"
    DEPLOYMENT_ENVIRONMENT         = var.environment
    INTEGRATION_LOG_RETENTION_DAYS = var.integration_log_retention_days == null ? null : tostring(var.integration_log_retention_days)
  }
  sensitive = true
}

output "dashboard" {
  value = "infra/observability/dashboard.json"
}

# Portable alert definitions for integration diagnosis (mirrored in the dashboard). Thresholds
# are technical starting points until SLOs are approved (DEC-007); no backend is provisioned.
output "integration_alerts" {
  value = [
    {
      name      = "integration-failures-elevated"
      condition = "integration_failure_ratio > 0.05 for 15m"
      severity  = "medium"
    },
    {
      name      = "stripe-webhook-failing"
      condition = "stripe_webhook_failures > 0 for 15m"
      severity  = "high"
    },
    {
      name      = "integration-log-store-failing"
      condition = "integration_log_failures > 0 for 10m"
      severity  = "high"
    },
  ]
}
