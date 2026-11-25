import { NextResponse } from "next/server";
import { loadProfile, profileMutation } from "../../../features/profile/bff";
import { guard, noStore } from "../../../server/bff/responses";

export async function GET(request: Request) {
  const auth = await guard(request);
  if ("error" in auth) return auth.error;
  return NextResponse.json(await loadProfile(auth.session), { headers: noStore });
}
export const PATCH = (request: Request) => profileMutation(request, "save");
