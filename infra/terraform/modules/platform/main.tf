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
  resource_count = var.provision_cloud ? 1 : 0
  project_name   = "${var.name_prefix}-${var.environment}"
  git_repository = var.github_repository == "" ? null : {
    type              = "github"
    repo              = var.github_repository
    production_branch = var.production_branch
  }
}

resource "supabase_project" "this" {
  count = local.resource_count

  organization_id         = var.supabase_organization_id
  name                    = local.project_name
  database_password       = var.supabase_database_password
  region                  = var.supabase_region
  instance_size           = var.supabase_instance_size
  legacy_api_keys_enabled = false

  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = var.environment != "production" || var.production_approved
      error_message = "Production provisioning requires production_approved=true after the recorded gate."
    }
  }
}

resource "supabase_settings" "this" {
  count = local.resource_count

  project_ref     = supabase_project.this[0].id
  database        = jsonencode(var.supabase_database_settings)
  auth            = jsonencode(var.supabase_auth_settings)
  storage         = jsonencode(var.supabase_storage_settings)
  ssl_enforcement = var.supabase_ssl_enforcement
}

resource "vercel_project" "private_web" {
  count = local.resource_count

  name                                              = "${local.project_name}-private"
  framework                                         = "nextjs"
  root_directory                                    = "apps/private-web"
  build_command                                     = "pnpm --filter @ice24/private-web... build"
  install_command                                   = "pnpm install --frozen-lockfile"
  node_version                                      = "24.x"
  git_repository                                    = local.git_repository
  git_fork_protection                               = true
  automatically_expose_system_environment_variables = false
  protected_sourcemaps                              = true
}

resource "vercel_project" "public_portal" {
  count = local.resource_count

  name                                              = "${local.project_name}-public"
  framework                                         = "nextjs"
  root_directory                                    = "apps/public-portal"
  build_command                                     = "pnpm --filter @ice24/public-portal... build"
  install_command                                   = "pnpm install --frozen-lockfile"
  node_version                                      = "24.x"
  git_repository                                    = local.git_repository
  git_fork_protection                               = true
  automatically_expose_system_environment_variables = false
  protected_sourcemaps                              = true
}

resource "vercel_project" "api" {
  count = local.resource_count

  name                                              = "${local.project_name}-api"
  root_directory                                    = "apps/api"
  build_command                                     = "pnpm --filter @ice24/api... build"
  install_command                                   = "pnpm install --frozen-lockfile"
  node_version                                      = "24.x"
  git_repository                                    = local.git_repository
  git_fork_protection                               = true
  automatically_expose_system_environment_variables = false
  protected_sourcemaps                              = true
}

resource "vercel_project_domain" "private_web" {
  count = local.resource_count == 1 && var.private_domain != null ? 1 : 0

  project_id = vercel_project.private_web[0].id
  domain     = var.private_domain
}

resource "vercel_project_domain" "public_portal" {
  count = local.resource_count == 1 && var.public_domain != null ? 1 : 0

  project_id = vercel_project.public_portal[0].id
  domain     = var.public_domain
}

output "supabase_project_ref" {
  value = try(supabase_project.this[0].id, null)
}

output "vercel_project_ids" {
  value = {
    api           = try(vercel_project.api[0].id, null)
    private_web   = try(vercel_project.private_web[0].id, null)
    public_portal = try(vercel_project.public_portal[0].id, null)
  }
}
