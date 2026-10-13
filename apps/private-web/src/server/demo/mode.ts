/**
 * UX review demo mode (F6-00). Fictitious personas and data so non-technical reviewers can open
 * and manipulate the screens without an identity provider or API.
 *
 * It is enabled only when ICE24_DEMO_MODE=1 AND the process is neither a production build
 * (NODE_ENV=production, which `next build`/`next start` always set) nor a Vercel production
 * deployment. Outside that combination every demo entry point answers as if it did not exist
 * and the real session and API are used.
 */
export type DemoEnvironment = Readonly<Record<string, string | undefined>>;

export const isDemoModeEnabled = (env: DemoEnvironment = process.env): boolean =>
  env.ICE24_DEMO_MODE === "1" && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
