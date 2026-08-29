variable "environment" {
  type = string
}

variable "provision_cloud" {
  type        = bool
  description = "Explicit safety switch. False performs a no-resource plan."
  default     = false
}

variable "production_approved" {
  type        = bool
  description = "Second safety gate required only for production."
  default     = false
}

variable "name_prefix" {
  type    = string
  default = "ice24-os"
}

variable "supabase_organization_id" {
  type = string
}

variable "supabase_database_password" {
  type      = string
  sensitive = true
}

variable "supabase_region" {
  type = string
}

variable "supabase_instance_size" {
  type    = string
  default = "micro"
}

variable "supabase_database_settings" {
  type = any
}

variable "supabase_auth_settings" {
  type = any
}

variable "supabase_storage_settings" {
  type = any
}

variable "supabase_ssl_enforcement" {
  type    = bool
  default = true
}

variable "vercel_team_id" {
  type = string
}

variable "github_repository" {
  type        = string
  description = "Repository in owner/name form. Empty keeps projects disconnected."
  default     = ""
}

variable "production_branch" {
  type    = string
  default = "main"
}

variable "private_domain" {
  type     = string
  default  = null
  nullable = true
}

variable "public_domain" {
  type     = string
  default  = null
  nullable = true
}
