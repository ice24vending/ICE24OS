"use client";
import { useState, type KeyboardEvent } from "react";
import { Button, ButtonLink, Icon, StatusTag } from "@ice24/ui";
import type { ScheduledActivity } from "@ice24/contracts";
import {
  activityDay,
  calendarDays,
  moveDay,
  movePeriod,
  parseDay,
  type CalendarView,
} from "./calendar-dates";
import { MAINTENANCE_LABELS, maintenanceTone, assignableActivity } from "./maintenance-status";
const label = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", ...options }).format(parseDay(day));
export function MaintenanceCalendar({
  items,
  today,
  canAssign,
  partial,
}: {
  items: readonly ScheduledActivity[];
  today: string;
  canAssign: boolean;
  partial: boolean;
}) {
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<CalendarView>("month");
  const days = calendarDays(selected, view);
  const urgency = (item: ScheduledActivity) =>
    [
      "critical",
      "overdue",
      "upcoming",
      "in_progress",
      "scheduled",
      "completed",
      "cancelled",
    ].indexOf(item.state);
  const rows = items
    .filter((item) => activityDay(item) === selected)
    .sort((a, b) => urgency(a) - urgency(b));
  const undated = items.filter((item) => !item.dueAt);
  const select = (day: string, focus = false) => {
    setSelected(day);
    if (focus)
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>(`[data-calendar-day="${day}"]`)?.focus(),
      );
  };
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const offset = (
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>
    )[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      select(moveDay(day, offset), true);
    } else if (["Home", "End", "PageUp", "PageDown"].includes(event.key)) {
      event.preventDefault();
      const week = calendarDays(day, "week");
      select(
        event.key === "Home"
          ? week[0]!
          : event.key === "End"
            ? week[6]!
            : movePeriod(day, view, event.key === "PageUp" ? -1 : 1),
        true,
      );
    }
  }
  return (
    <section className="maintenance-calendar" aria-label="Calendario de actividades">
      <div className="maintenance-calendar__toolbar">
        <div className="maintenance-calendar__period">
          <Button
            variant="tertiary"
            icon="chevron-left"
            aria-label="Periodo anterior"
            onClick={() => select(movePeriod(selected, view, -1))}
          />
          <h2 aria-live="polite">
            {view === "month"
              ? label(selected, { month: "long", year: "numeric" })
              : view === "week"
                ? `${label(days[0]!, { day: "numeric", month: "short" })} – ${label(days[6]!, { day: "numeric", month: "short", year: "numeric" })}`
                : label(selected, { dateStyle: "long" })}
          </h2>
          <Button
            variant="tertiary"
            icon="chevron-right"
            aria-label="Periodo siguiente"
            onClick={() => select(movePeriod(selected, view, 1))}
          />
          <Button variant="secondary" icon="calendar" onClick={() => select(today)}>
            Hoy
          </Button>
        </div>
        <div className="maintenance-calendar__views" role="group" aria-label="Vista del calendario">
          {(
            [
              ["month", "Mes"],
              ["week", "Semana"],
              ["day", "Día"],
            ] as const
          ).map(([value, text]) => (
            <Button
              key={value}
              variant="tertiary"
              icon={value === "day" ? "list" : "calendar"}
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {text}
            </Button>
          ))}
        </div>
      </div>
      <div className="maintenance-calendar__legend" aria-label="Leyenda de urgencia">
        <StatusTag tone="danger">Crítica</StatusTag>
        <StatusTag tone="warning">Vencida / Próxima</StatusTag>
        <StatusTag tone="info">Programada / En atención</StatusTag>
        <StatusTag tone="success">Completada</StatusTag>
      </div>
      <p className="maintenance-calendar__hint">
        Fechas locales de cada sucursal. Selecciona un día para consultar sus actividades.
        {partial &&
          " Resultados parciales: hay más actividades en la siguiente página. Usa los filtros para acotar la consulta."}
      </p>
      {view !== "day" && (
        <div className={`maintenance-calendar__grid maintenance-calendar__grid--${view}`}>
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <span key={day} className="maintenance-calendar__weekday">
              {day}
            </span>
          ))}
          {days.map((day) => {
            const activities = items
              .filter((item) => activityDay(item) === day)
              .sort((a, b) => urgency(a) - urgency(b));
            const urgent = activities.some((item) => item.state === "critical");
            return (
              <button
                type="button"
                key={day}
                data-calendar-day={day}
                className="maintenance-calendar__day"
                data-outside={day.slice(0, 7) !== selected.slice(0, 7)}
                aria-pressed={selected === day}
                aria-current={day === today ? "date" : undefined}
                tabIndex={selected === day ? 0 : -1}
                aria-label={`${label(day, { dateStyle: "full" })}, ${activities.length} actividades${urgent ? ", incluye críticas" : ""}`}
                onClick={() => select(day)}
                onKeyDown={(event) => keyDown(event, day)}
              >
                <span className="maintenance-calendar__number">{Number(day.slice(8))}</span>
                {activities.length > 0 && (
                  <span
                    className="maintenance-calendar__count"
                    data-tone={maintenanceTone(activities[0]!.state)}
                  >
                    <Icon name={urgent ? "danger" : "activity"} size={16} />
                    {activities.length}
                  </span>
                )}
                <span className="maintenance-calendar__previews">
                  {activities.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className="maintenance-calendar__event"
                      data-tone={maintenanceTone(item.state)}
                    >
                      {item.machineCode} · {item.name}
                    </span>
                  ))}
                  {activities.length > 2 && <span>+{activities.length - 2} más</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <section className="maintenance-calendar__agenda" aria-label="Actividades del día">
        <h3>
          {label(selected, { weekday: "long", day: "numeric", month: "long" })}{" "}
          <span>· {rows.length} actividades</span>
        </h3>
        {!rows.length && (
          <p>No hay actividades {partial ? "en esta página " : ""}para el día seleccionado.</p>
        )}
        {rows.map((item) => (
          <article
            key={item.id}
            className="maintenance-calendar__activity"
            data-tone={maintenanceTone(item.state)}
          >
            <div>
              <StatusTag tone={maintenanceTone(item.state)}>
                {MAINTENANCE_LABELS[item.state]}
              </StatusTag>
              <h4>{item.name}</h4>
              <p>
                {item.machineCode} · {item.branchName}
              </p>
            </div>
            {canAssign && assignableActivity(item.state) && !item.assigneeId && (
              <ButtonLink
                variant="secondary"
                icon="user-plus"
                href={`/maintenance/work-orders/new?sourceType=activity&sourceId=${item.id}`}
              >
                Asignar técnico
              </ButtonLink>
            )}
          </article>
        ))}
      </section>
      {undated.length > 0 && (
        <details className="maintenance-calendar__undated">
          <summary>Por uso o condición · {undated.length} actividades sin fecha</summary>
          {undated.map((item) => (
            <p key={item.id}>
              {item.machineCode} · {item.name}{" "}
              <StatusTag tone={maintenanceTone(item.state)}>
                {MAINTENANCE_LABELS[item.state]}
              </StatusTag>
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
