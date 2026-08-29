locals {
  queues = {
    general_jobs = { visibility_timeout_seconds = 60, max_attempts = 5, dead_letter_queue = "general_jobs_dlq" }
    pdf_jobs     = { visibility_timeout_seconds = 180, max_attempts = 3, dead_letter_queue = "pdf_jobs_dlq" }
  }
}

output "queues" {
  description = "Durable PGMQ queues and retry contracts created by the platform migration."
  value       = local.queues
}

output "scheduler" {
  value = {
    name     = "ice24_queue_heartbeat"
    schedule = "*/5 * * * *"
  }
}

output "migration" {
  value = "supabase/migrations/20260825000100_phase2_platform.sql"
}
