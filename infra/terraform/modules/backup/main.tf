variable "environment" {
  type = string
}

locals {
  production_like = contains(["staging", "production"], var.environment)
}

output "policy" {
  value = {
    database_logical_backup = true
    database_pitr_required  = local.production_like
    object_manifest         = true
    restore_test_days       = local.production_like ? 90 : 30
    target_rpo_minutes      = 15
    target_rto_minutes      = 240
  }
}

output "runbook" {
  value = "docs/runbooks/backup-restore.md"
}
