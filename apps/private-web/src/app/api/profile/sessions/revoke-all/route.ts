import { profileMutation } from "../../../../../features/profile/bff";

export const POST = (request: Request) => profileMutation(request, "others");
