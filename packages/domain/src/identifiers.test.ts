import { describe, expect, it } from "vitest";
import { isMachineCode, machineCode } from "./identifiers.js";
describe("ADR-020 permanent machine identifiers", () => {
  it("uses a canonical ten-character code and checksum", () => {
    expect(machineCode(new Uint8Array(10))).toBe("ICE24-0000000000-0");
    expect(isMachineCode("ice2400000000000")).toBe(true);
  });
  it("validates full entropy values and rejects a changed check digit", () => {
    for (let n = 0; n < 256; n++) {
      const value = machineCode(Uint8Array.from({ length: 10 }, (_, i) => (n + i) % 256));
      expect(isMachineCode(value)).toBe(true);
      expect(isMachineCode(value.slice(0, -1) + (value.endsWith("0") ? "1" : "0"))).toBe(false);
    }
  });
  it("rejects malformed and ambiguous codes", () => {
    for (const code of ["", "ICE24-000000000I-0", "ICE24-0000000000-00", "XXX24-0000000000-0"])
      expect(isMachineCode(code)).toBe(false);
    expect(() => machineCode(new Uint8Array(9))).toThrow();
  });
});
