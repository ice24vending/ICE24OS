import { redirect } from "next/navigation";

/** «Cuentas y máquinas» was split into four destinations (F6-D03); old links land on machines. */
export default function WorkspacePage() {
  redirect("/machines");
}
