import { profileMutation } from "../../../../../features/profile/bff";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return profileMutation(request, "session", (await context.params).sessionId);
}
