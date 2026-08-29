terraform {
  required_version = ">= 1.11.0, < 2.0.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "1.10.1"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "5.11.0"
    }
  }

  backend "http" {}
}

provider "supabase" {}

provider "vercel" {
  team = var.vercel_team_id
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
  type = string
}

variable "private_web_url" {
  type = string
}

variable "public_portal_url" {
  type = string
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

module "ice24" {
  source = "../../stacks/ice24"

  environment                = "test"
  provision_cloud            = var.provision_cloud
  production_approved        = var.production_approved
  supabase_organization_id   = var.supabase_organization_id
  supabase_database_password = var.supabase_database_password
  supabase_region            = var.supabase_region
  supabase_instance_size     = var.supabase_instance_size
  vercel_team_id             = var.vercel_team_id
  github_repository          = var.github_repository
  private_web_url            = var.private_web_url
  public_portal_url          = var.public_portal_url
  private_domain             = var.private_domain
  public_domain              = var.public_domain
  otlp_endpoint              = var.otlp_endpoint
  enable_edge_firewall       = var.enable_edge_firewall
}

output "deployment_contract" {
  value = module.ice24.deployment_contract
}

output "platform_ids" {
  value = module.ice24.platform_ids
}

