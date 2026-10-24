import { cookies } from "next/headers";

import { DEMO_ACCOUNTS } from "../../server/demo/fixtures";
import { isDemoModeEnabled } from "../../server/demo/mode";
import { DEMO_PERSONAS } from "../../server/demo/personas";
import {
  DEMO_COOKIE,
  DEMO_MODE_LABELS,
  DEMO_NETWORK_LABELS,
  DEMO_SCENARIO_LABELS,
  decodeDemoState,
} from "../../server/demo/state";
import { DemoPanel } from "./demo-panel";
import "./demo-panel.css";

/** Server side of the demo panel: renders nothing unless the demo mode is on and started. */
export async function DemoSlot() {
  if (!isDemoModeEnabled()) return null;
  const state = decodeDemoState((await cookies()).get(DEMO_COOKIE)?.value);
  if (state === undefined) return null;
  const persona = DEMO_PERSONAS[state.persona];
  return (
    <DemoPanel
      csrfToken={state.csrf}
      persona={state.persona}
      account={state.account}
      branch={state.branch}
      mode={state.mode}
      network={state.network}
      scenario={state.scenario ?? "normal"}
      branchScoped={persona.scope !== "ACCOUNT"}
      personas={Object.values(DEMO_PERSONAS).map((p) => ({
        value: p.key,
        label: p.label,
        hint: p.description,
      }))}
      accounts={Object.values(DEMO_ACCOUNTS).map((a) => ({
        value: a.key,
        label: a.isDemo ? `${a.name} (cuenta demo)` : a.name,
      }))}
      branches={DEMO_ACCOUNTS[state.account].branches.map((b) => ({
        value: b.id,
        label: b.name,
      }))}
      modes={Object.entries(DEMO_MODE_LABELS).map(([value, label]) => ({ value, label }))}
      networks={Object.entries(DEMO_NETWORK_LABELS).map(([value, label]) => ({ value, label }))}
      scenarios={Object.entries(DEMO_SCENARIO_LABELS).map(([value, label]) => ({ value, label }))}
    />
  );
}
