import { ianaTimeZoneSchema, type TaskSchedule } from "@ice24/contracts";

/**
 * Window arithmetic of the F5-13 scheduler. Every computation takes the task's explicit IANA
 * zone; the server zone is never read (PROJECT_RULES 24.2). A window is the half-open period
 * [start, end) that closes at a fire time; it becomes due once `end <= now`.
 */
export interface ScheduleWindow {
  readonly start: Date;
  readonly end: Date;
  /** Idempotency key of the window inside its task: the UTC instant at which it closes. */
  readonly key: string;
}

export class ScheduleError extends Error {}

interface CronField {
  readonly values: ReadonlySet<number>;
  readonly restricted: boolean;
}

export interface CronExpression {
  readonly minutes: CronField;
  readonly hours: CronField;
  readonly days: CronField;
  readonly months: CronField;
  readonly weekdays: CronField;
}

const FIELD_RANGES = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
] as const;

const parseField = (raw: string, [min, max]: readonly [number, number]): CronField => {
  const values = new Set<number>();
  const integer = (text: string): number => {
    if (!/^\d{1,2}$/u.test(text)) throw new ScheduleError(`Invalid cron value ${text}`);
    const value = Number(text);
    if (value < min || value > max) throw new ScheduleError(`Cron value ${text} out of range`);
    return value;
  };
  for (const part of raw.split(",")) {
    const [range, stepText] = part.split("/");
    if (range === undefined || part.split("/").length > 2)
      throw new ScheduleError(`Invalid cron part ${part}`);
    const step = stepText === undefined ? 1 : integer(stepText);
    if (step < 1) throw new ScheduleError("Cron step must be positive");
    let from: number, to: number;
    if (range === "*") [from, to] = [min, max];
    else if (range.includes("-")) {
      const [a, b] = range.split("-");
      from = integer(a ?? "");
      to = integer(b ?? "");
      if (from > to) throw new ScheduleError(`Invalid cron range ${range}`);
    } else {
      from = integer(range);
      to = stepText === undefined ? from : max;
    }
    for (let value = from; value <= to; value += step) values.add(value);
  }
  // As in Vixie cron, a field starting with "*" (including "*/n") does not restrict the day.
  return { values, restricted: !raw.startsWith("*") };
};

/** Five fields: minute hour day-of-month month day-of-week (0 and 7 are Sunday). */
export function parseCron(expression: string): CronExpression {
  const fields = expression.trim().split(/\s+/u);
  if (fields.length !== 5) throw new ScheduleError("Cron expressions have five fields");
  const [minutes, hours, days, months, weekdays] = fields.map((field, index) =>
    parseField(field, FIELD_RANGES[index]!),
  ) as [CronField, CronField, CronField, CronField, CronField];
  if (weekdays.values.has(7)) (weekdays.values as Set<number>).add(0);
  return { minutes, hours, days, months, weekdays };
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (timeZone: string): Intl.DateTimeFormat => {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, cached);
  }
  return cached;
};

interface WallTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

/** Local calendar fields of an instant in `timeZone`. */
export function wallTime(instant: number, timeZone: string): WallTime {
  const parts: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(instant)))
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
  };
}

const sameWall = (a: WallTime, b: WallTime): boolean =>
  a.year === b.year &&
  a.month === b.month &&
  a.day === b.day &&
  a.hour === b.hour &&
  a.minute === b.minute;

/**
 * UTC instant of a local wall time. A time skipped by a DST jump has no instant (null); a
 * repeated time resolves to its first occurrence.
 */
export function zonedInstant(local: WallTime, timeZone: string): number | null {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const candidates = new Set<number>();
  for (const probe of [naive - 86_400_000, naive, naive + 86_400_000]) {
    const seen = wallTime(probe, timeZone);
    const offset =
      Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute) -
      Math.floor(probe / 60_000) * 60_000;
    candidates.add(naive - offset);
  }
  const valid = [...candidates]
    .filter((instant) => sameWall(wallTime(instant, timeZone), local))
    .sort((a, b) => a - b);
  return valid[0] ?? null;
}

const dayMatches = (cron: CronExpression, day: number, month: number, weekday: number): boolean => {
  if (!cron.months.values.has(month)) return false;
  const byDay = cron.days.values.has(day);
  const byWeekday = cron.weekdays.values.has(weekday);
  // Standard cron: when both day fields are restricted, either one matching is enough.
  if (cron.days.restricted && cron.weekdays.restricted) return byDay || byWeekday;
  if (cron.days.restricted) return byDay;
  if (cron.weekdays.restricted) return byWeekday;
  return true;
};

const descending = (field: CronField): number[] => [...field.values].sort((a, b) => b - a);
/** Enough to find "29 February on a Monday"-style rare dates. */
const MAX_DAYS_BACK = 366 * 8;

/** Latest fire time of `cron` in `timeZone` at or before `before` (ms), or null. */
export function latestFire(cron: CronExpression, timeZone: string, before: number): number | null {
  const today = wallTime(before, timeZone);
  const hours = descending(cron.hours);
  const minutes = descending(cron.minutes);
  for (let back = 0; back <= MAX_DAYS_BACK; back++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day - back));
    const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    if (!dayMatches(cron, day, month, date.getUTCDay())) continue;
    for (const hour of hours)
      for (const minute of minutes) {
        const instant = zonedInstant({ year, month, day, hour, minute }, timeZone);
        if (instant !== null && instant <= before) return instant;
      }
  }
  return null;
}

/** Validates a schedule and its zone; throws ScheduleError with a diagnostic message. */
export function validateSchedule(schedule: TaskSchedule, timeZone: string): void {
  if (!ianaTimeZoneSchema.safeParse(timeZone).success)
    throw new ScheduleError(`Unknown time zone ${timeZone}`);
  if (schedule.kind === "cron") {
    const cron = parseCron(schedule.expression);
    if (latestFire(cron, timeZone, Date.now()) === null)
      throw new ScheduleError(`Cron ${schedule.expression} never fires`);
  }
}

const toWindow = (start: number, end: number): ScheduleWindow => ({
  start: new Date(start),
  end: new Date(end),
  key: new Date(end).toISOString(),
});

/** The last window that closed at or before `at`, or null when the schedule never fired. */
export function windowClosingBy(
  schedule: TaskSchedule,
  timeZone: string,
  at: number,
): ScheduleWindow | null {
  if (schedule.kind === "interval") {
    const size = schedule.everySeconds * 1000;
    const end = Math.floor(at / size) * size;
    return toWindow(end - size, end);
  }
  const cron = parseCron(schedule.expression);
  const end = latestFire(cron, timeZone, at);
  if (end === null) return null;
  const start = latestFire(cron, timeZone, end - 60_000);
  return start === null ? null : toWindow(start, end);
}

/** Upper bound of missed windows that are counted after a long outage. */
const MAX_COUNTED = 10_000;

/**
 * Windows to enqueue now. `lastEnd` is the end of the newest window already recorded for the
 * task (null on its first run, which starts from the latest closed window without backfill).
 * At most `catchUp` of the most recent missed windows are returned; older ones are reported as
 * `skipped` so operation can see them (metric and log), never silently dropped.
 */
export function dueWindows(
  schedule: TaskSchedule,
  timeZone: string,
  now: Date,
  lastEnd: Date | null,
  catchUp: number,
): { windows: ScheduleWindow[]; skipped: number } {
  if (!Number.isInteger(catchUp) || catchUp < 1) throw new ScheduleError("catchUp must be >= 1");
  const latest = windowClosingBy(schedule, timeZone, now.getTime());
  if (latest === null || (lastEnd !== null && latest.end.getTime() <= lastEnd.getTime()))
    return { windows: [], skipped: 0 };
  if (lastEnd === null) return { windows: [latest], skipped: 0 };
  const windows = [latest];
  let missed = 1;
  if (schedule.kind === "interval") {
    const size = schedule.everySeconds * 1000;
    missed = Math.min(MAX_COUNTED, Math.ceil((latest.end.getTime() - lastEnd.getTime()) / size));
    for (let i = 1; i < Math.min(catchUp, missed); i++) {
      const end = latest.end.getTime() - i * size;
      windows.unshift(toWindow(end - size, end));
    }
    return { windows, skipped: missed - windows.length };
  }
  let current = latest;
  while (current.start.getTime() > lastEnd.getTime() && missed < MAX_COUNTED) {
    const previous = windowClosingBy(schedule, timeZone, current.start.getTime());
    if (previous === null || previous.end.getTime() !== current.start.getTime()) break;
    missed += 1;
    if (windows.length < catchUp) windows.unshift(previous);
    current = previous;
  }
  return { windows, skipped: missed - windows.length };
}
