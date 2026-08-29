terraform {
  required_providers {
    supabase = {
      source = "supabase/supabase"
    }
    vercel = {
      source = "vercel/vercel"
    }
  }
}

locals {
  normalized_private_domain = var.private_domain == "" ? null : var.private_domain
  normalized_public_domain  = var.public_domain == "" ? null : var.public_domain
  normalized_otlp_endpoint  = var.otlp_endpoint == "" ? null : var.otlp_endpoint
}

module "database" {
  source      = "../../modules/database"
  environment = var.environment
}

module "object_storage" {
  source      = "../../modules/object-storage"
  environment = var.environment
}

module "messaging" {
  source = "../../modules/messaging"
}

module "identity" {
  source                = "../../modules/identity"
  private_web_url       = var.private_web_url
  preview_redirect_urls = var.preview_redirect_urls
}

module "secrets" {
  source      = "../../modules/secrets"
  environment = var.environment
}

module "observability" {
  source        = "../../modules/observability"
  environment   = var.environment
  otlp_endpoint = local.normalized_otlp_endpoint
}

module "backup" {
  source      = "../../modules/backup"
  environment = var.environment
}

module "platform" {
  source = "../../modules/platform"

  environment                = var.environment
  provision_cloud            = var.provision_cloud
  production_approved        = var.production_approved
  supabase_organization_id   = var.supabase_organization_id
  supabase_database_password = var.supabase_database_password
  supabase_region            = var.supabase_region
  supabase_instance_size     = var.supabase_instance_size
  supabase_database_settings = module.database.settings
  supabase_auth_settings     = module.identity.settings
  supabase_storage_settings  = module.object_storage.settings
  supabase_ssl_enforcement   = module.database.ssl_enforcement
  vercel_team_id             = var.vercel_team_id
  github_repository          = var.github_repository
  production_branch          = var.production_branch
  private_domain             = local.normalized_private_domain
  public_domain              = local.normalized_public_domain
}

module "edge" {
  source = "../../modules/edge"

  enabled    = var.provision_cloud && var.enable_edge_firewall
  project_id = module.platform.vercel_project_ids.public_portal
  team_id    = var.vercel_team_id
}

check "production_gate" {
  assert {
    condition     = var.environment != "production" || !var.provision_cloud || var.production_approved
    error_message = "Production apply is blocked until production_approved=true is supplied by the protected environment."
  }
}

output "deployment_contract" {
  value = {
    environment           = var.environment
    cloud_enabled         = var.provision_cloud
    database_extensions   = module.database.required_extensions
    storage_buckets       = keys(module.object_storage.buckets)
    queues                = module.messaging.queues
    backup                = module.backup.policy
    required_secret_names = module.secrets.required_secret_names
    public_portal_url     = var.public_portal_url
  }
}

output "platform_ids" {
  value = {
    supabase = module.platform.supabase_project_ref
    vercel   = module.platform.vercel_project_ids
    firewall = module.edge.firewall_id
  }
}
