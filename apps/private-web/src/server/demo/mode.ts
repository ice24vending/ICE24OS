/**
 * UX review demo mode (F6-00). Fictitious personas and data so non-technical reviewers can open
 * and manipulate the screens without an identity provider or API.
 *
 * Development requires ICE24_DEMO_MODE=1. Production builds require the explicitly approved,
 * protected Preview of ADR-026. Vercel production deployments always reject demo sessions.
 */
export type DemoEnvironment = Readonly<Record<string, string | undefined>>;

export const isDemoModeEnabled = (env: DemoEnvironment = process.env): boolean => {
  if (env.ICE24_DEMO_MODE !== "1" || env.VERCEL_ENV === "production") return false;
  // ADR-026: operational attestations, disabled until approval and external protection checks.
  if (env.VERCEL_ENV === "preview")
    return env.ICE24_DEMO_PREVIEW_APPROVED === "1" && env.ICE24_DEMO_PROTECTION_VERIFIED === "1";
  return env.NODE_ENV !== "production";
};
