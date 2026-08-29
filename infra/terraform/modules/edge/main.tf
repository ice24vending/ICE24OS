terraform {
  required_providers {
    vercel = {
      source = "vercel/vercel"
    }
  }
}

variable "enabled" {
  type    = bool
  default = false
}

variable "project_id" {
  type     = string
  default  = null
  nullable = true
}

variable "team_id" {
  type = string
}

resource "vercel_firewall_config" "portal" {
  count = var.enabled && var.project_id != null ? 1 : 0

  enabled    = true
  project_id = var.project_id
  team_id    = var.team_id

  managed_rulesets {
    owasp {
      xss  = { action = "deny" }
      sqli = { action = "deny" }
      rce  = { action = "deny" }
      php  = { action = "deny" }
      java = { action = "deny" }
      lfi  = { action = "deny" }
      rfi  = { action = "deny" }
      gen  = { action = "deny" }
    }

    bot_protection {
      action = "challenge"
      active = true
    }
  }

  rules {
    rule {
      name        = "Public portal rate limit"
      description = "Bound abusive traffic without relying on application authorization."
      condition_group = [{
        conditions = [{
          type  = "path"
          op    = "pre"
          value = "/"
        }]
      }]
      action = {
        action = "rate_limit"
        rate_limit = {
          limit  = 120
          window = 60
          keys   = ["ip", "ja4"]
          algo   = "fixed_window"
          action = "deny"
        }
        action_duration = "1m"
      }
    }
  }
}

output "firewall_id" {
  value = try(vercel_firewall_config.portal[0].id, null)
}
