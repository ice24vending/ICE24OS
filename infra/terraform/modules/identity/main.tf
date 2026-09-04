variable "private_web_url" {
  type = string
}

variable "preview_redirect_urls" {
  type    = list(string)
  default = []
}

output "settings" {
  description = "Supabase Auth settings for invitation-only access. TOTP is enabled by the platform."
  value = {
    site_url                        = var.private_web_url
    uri_allow_list                  = join(",", concat([var.private_web_url], var.preview_redirect_urls))
    disable_signup                  = true
    mailer_autoconfirm              = false
    password_min_length             = 12
    security_manual_linking_enabled = false
  }
}

output "oidc_discovery_path" {
  value = "/auth/v1/.well-known/openid-configuration"
}

output "phase3_security_policy" {
  description = "Server-enforced identity policy; role and context authorization remains in ICE24 OS."
  value = {
    oidc_flow                   = "authorization_code_pkce"
    totp_enabled                = true
    public_signup_enabled       = false
    browser_refresh_token       = false
    administrative_idle_minutes = 30
    absolute_session_hours      = 12
    aal2_role_codes             = ["IA", "OW", "SA"]
  }
}
