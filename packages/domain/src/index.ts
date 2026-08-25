export class DomainError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export const requireNonEmpty = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new DomainError("INVALID_VALUE", `${fieldName} must not be empty`);
  }
  return normalized;
};
