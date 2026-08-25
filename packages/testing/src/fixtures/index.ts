export interface SyntheticAccountFixture {
  readonly accountId: string;
  readonly name: string;
  readonly isSynthetic: true;
}

export interface SyntheticUserFixture {
  readonly userId: string;
  readonly accountId: string;
  readonly displayName: string;
  readonly email: string;
  readonly isSynthetic: true;
}

export const syntheticAccounts: readonly SyntheticAccountFixture[] = [
  {
    accountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b101",
    name: "Cuenta Ficticia Norte",
    isSynthetic: true,
  },
  {
    accountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b201",
    name: "Cuenta Ficticia Sur",
    isSynthetic: true,
  },
];

export const syntheticUsers: readonly SyntheticUserFixture[] = [
  {
    userId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
    accountId: syntheticAccounts[0]!.accountId,
    displayName: "Operador Ficticio Uno",
    email: "operator.one@example.invalid",
    isSynthetic: true,
  },
  {
    userId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b202",
    accountId: syntheticAccounts[1]!.accountId,
    displayName: "Operador Ficticio Dos",
    email: "operator.two@example.invalid",
    isSynthetic: true,
  },
];
