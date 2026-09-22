const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const checksumAlphabet = `${alphabet}*~$=U`;

/** ADR-020: entropy is supplied by an infrastructure CSPRNG. */
export function machineCode(entropy: Uint8Array): string {
  if (entropy.length !== 10) throw new Error("Ten random bytes are required");
  let remainder = 0;
  const digits = Array.from(entropy, (byte) => {
    const digit = byte & 31;
    remainder = (remainder * 32 + digit) % 37;
    return alphabet[digit];
  }).join("");
  return `ICE24-${digits}-${checksumAlphabet[remainder]}`;
}

export function isMachineCode(value: string): boolean {
  const normalized = value.toUpperCase().replaceAll("-", "");
  if (!normalized.startsWith("ICE24") || normalized.length !== 16) return false;
  let remainder = 0;
  for (const digit of normalized.slice(5, 15)) {
    const index = alphabet.indexOf(digit);
    if (index < 0) return false;
    remainder = (remainder * 32 + index) % 37;
  }
  return normalized[15] === checksumAlphabet[remainder];
}
