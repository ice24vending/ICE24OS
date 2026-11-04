import type { ScheduledActivity } from "@ice24/contracts";
export type CalendarView = "month" | "week" | "day";
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const parseDay = (day: string) => new Date(`${day}T12:00:00Z`);
export function moveDay(day: string, amount: number) {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}
export function calendarDays(day: string, view: CalendarView) {
  if (view === "day") return [day];
  const date = parseDay(view === "month" ? `${day.slice(0, 7)}-01` : day);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return Array.from({ length: view === "month" ? 42 : 7 }, (_, index) =>
    moveDay(dateKey(date), index),
  );
}
export function movePeriod(day: string, view: CalendarView, direction: number) {
  if (view !== "month") return moveDay(day, direction * (view === "week" ? 7 : 1));
  const date = parseDay(`${day.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return dateKey(date);
}
export function activityDay(item: ScheduledActivity) {
  return item.dueAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: item.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(item.dueAt))
    : null;
}
