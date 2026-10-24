/**
 * Preload for the private web under `pnpm test:ui` (F6-12, `node --import`): with
 * ICE24_DEMO_NOW set, `Date.now()` and `new Date()` return that instant in the server process,
 * as `page.clock.setFixedTime` does in the browser. Server and client render the same dates and
 * relative times (no hydration mismatch), and the screenshots do not change from day to day.
 * Timers are untouched. Never loaded by the product.
 */
const fixed = Date.parse(process.env.ICE24_DEMO_NOW ?? "");
if (!Number.isNaN(fixed)) {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() {
      return fixed;
    }
    // Own properties: Next copies the global Date into its sandbox, so inherited statics vanish.
    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  }
  globalThis.Date = FrozenDate;
}
