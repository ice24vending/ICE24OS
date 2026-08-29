variable "environment" {
  type = string
}

locals {
  buckets = {
    quarantine = {
      file_size_limit    = 52428800
      allowed_mime_types = ["application/pdf", "image/jpeg", "image/png"]
      retention_class    = "quarantine"
    }
    originals = {
      file_size_limit    = 52428800
      allowed_mime_types = ["application/pdf", "image/jpeg", "image/png"]
      retention_class    = "record"
    }
    derivatives = {
      file_size_limit    = 52428800
      allowed_mime_types = ["application/pdf", "image/jpeg", "image/png"]
      retention_class    = "derived"
    }
    exports = {
      file_size_limit    = 104857600
      allowed_mime_types = ["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
      retention_class    = "temporary"
    }
  }
}

output "buckets" {
  description = "Private buckets created by the versioned Supabase migration."
  value       = local.buckets
}

output "settings" {
  value = {
    fileSizeLimit = 104857600
    features = {
      imageTransformation = { enabled = false }
      s3Protocol          = { enabled = false }
    }
  }
}

output "migration" {
  value = "supabase/migrations/20260825000100_phase2_platform.sql"
}
