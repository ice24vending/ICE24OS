variable "environment" {
  type = string
}

variable "provision_cloud" {
  type    = bool
  default = false
}

variable "production_approved" {
  type    = bool
  default = false
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

variable "vercel_team_id" {
  type = string
}

variable "github_repository" {
  type    = string
  default = ""
}

variable "production_branch" {
  type    = string
  default = "main"
}

variable "private_web_url" {
  type = string
}

variable "public_portal_url" {
  type = string
}

variable "preview_redirect_urls" {
  type    = list(string)
  default = []
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

variable "otlp_endpoint" {
  type      = string
  sensitive = true
  default   = null
  nullable  = true
}

variable "enable_edge_firewall" {
  type    = bool
  default = false
}
