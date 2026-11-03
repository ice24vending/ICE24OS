import {
  addFrequency,
  subtractFrequency,
  type FrequencyDuration,
} from "./maintenance-frequency.js";

/** Local wall-clock represented as UTC only for calendar arithmetic, never persisted as UTC. */
function wallClock(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const number = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return (
    Date.UTC(
      number("year"),
      number("month") - 1,
      number("day"),
      number("hour"),
      number("minute"),
      number("second"),
    ) + instant.getUTCMilliseconds()
  );
}

/** F7-D06 provisional: first instant on overlaps; first valid local minute in a DST gap. */
export function shiftLocalFrequency(
  instant: Date,
  duration: FrequencyDuration,
  timezone: string,
  direction: 1 | -1 = 1,
): Date {
  const local = new Date(wallClock(instant, timezone));
  const target = (direction === 1 ? addFrequency : subtractFrequency)(local, duration).getTime();
  const offsets = [
    ...new Set(
      [-2, -1, 0, 1, 2].map((day) => {
        const sample = new Date(target + day * 86400000);
        return wallClock(sample, timezone) - sample.getTime();
      }),
    ),
  ];
  for (let minute = 0; minute <= 1440; minute++) {
    const desired = target + minute * 60000;
    const matches = offsets
      .map((offset) => desired - offset)
      .filter((candidate) => wallClock(new Date(candidate), timezone) === desired);
    if (matches.length) return new Date(Math.min(...matches));
  }
  throw new Error("No valid local calendar instant");
}
