import { syntheticAccounts, syntheticUsers } from "@ice24/testing/fixtures";

export interface DevelopmentSeedPlan {
  readonly datasetVersion: 1;
  readonly accounts: typeof syntheticAccounts;
  readonly users: typeof syntheticUsers;
}

export const buildDevelopmentSeedPlan = (): DevelopmentSeedPlan => ({
  datasetVersion: 1,
  accounts: syntheticAccounts,
  users: syntheticUsers,
});
