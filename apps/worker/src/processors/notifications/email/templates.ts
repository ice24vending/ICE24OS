import {
  emailTemplateKeySchema,
  parseEmailTemplateVariables,
  type CriticalAlertEmailVariables,
  type EmailTemplateKey,
  type ScheduledReportEmailVariables,
} from "@ice24/contracts";

/**
 * Server-side rendering of the versioned templates in EMAIL_TEMPLATES (@ice24/contracts).
 * Variables are validated against the exact stored version before rendering, every value is
 * HTML-escaped and links are built from the configured application origin plus an application
 * path, so a message never carries signed URLs, tokens, payloads or the recipient address.
 * A version, once released, is never edited: changes add a new version.
 */
export interface RenderedEmail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface RenderContext {
  /** Origin of the private application, e.g. https://app.example.mx (no path). */
  readonly baseUrl: string;
  /** IANA time zone of the recipient; dates never depend on the server zone. */
  readonly timeZone: string;
}

export class EmailTemplateError extends Error {
  public readonly code = "TEMPLATE_INVALID";
  public constructor() {
    super("TEMPLATE_INVALID");
    this.name = "EmailTemplateError";
  }
}

const FOOTER =
  "Mensaje automático de ICE24 OS; no respondas a este correo. Inicia sesión para consultar el detalle.";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** Absolute link on the application origin; anything resolving elsewhere is refused. */
const link = (baseUrl: string, path: string): string => {
  const url = new URL(path, `${baseUrl}/`);
  if (url.origin !== new URL(baseUrl).origin) throw new EmailTemplateError();
  return url.toString();
};

export function formatDate(iso: string, timeZone: string): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone,
      timeZoneName: "short",
    }).format(new Date(iso));
  try {
    return format(timeZone);
  } catch {
    return format("UTC"); // unknown zone in the profile: never fall back to the server zone
  }
}

const layout = (heading: string, paragraphs: string[], actions: [string, string][]): string =>
  [
    '<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>',
    escapeHtml(heading),
    '</title></head><body style="font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.5">',
    `<h1 style="font-size:20px">${escapeHtml(heading)}</h1>`,
    ...paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`),
    ...actions.map(
      ([label, href]) => `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`,
    ),
    `<p style="font-size:12px;color:#555">${escapeHtml(FOOTER)}</p>`,
    "</body></html>",
  ].join("");

function criticalAlertV1(vars: CriticalAlertEmailVariables, context: RenderContext): RenderedEmail {
  const occurred = formatDate(vars.occurredAt, context.timeZone);
  const actions: [string, string][] = [];
  if (vars.actionPath !== null && vars.actionLabel !== null)
    actions.push([vars.actionLabel, link(context.baseUrl, vars.actionPath)]);
  actions.push(["Abrir el centro de avisos", link(context.baseUrl, "/notifications")]);
  const heading = `Alerta crítica: ${vars.title}`;
  const paragraphs = [
    `Cuenta: ${vars.accountName}`,
    vars.message,
    `Ocurrió: ${occurred}`,
    "La alerta permanece fijada en ICE24 OS hasta que la marques como «Enterado».",
  ];
  return {
    subject: `[ICE24 OS] ${heading}`,
    text: [
      heading,
      "",
      ...paragraphs,
      "",
      ...actions.map(([label, href]) => `${label}: ${href}`),
      "",
      FOOTER,
    ].join("\n"),
    html: layout(heading, paragraphs, actions),
  };
}

function scheduledReportV1(
  vars: ScheduledReportEmailVariables,
  context: RenderContext,
): RenderedEmail {
  const heading = `Reporte programado: ${vars.reportName}`;
  const actions: [string, string][] = [
    ["Consultar el reporte", link(context.baseUrl, vars.reportPath)],
  ];
  const paragraphs = [
    `Cuenta: ${vars.accountName}`,
    `Periodo: ${vars.periodLabel}`,
    "El reporte está disponible en ICE24 OS para usuarios con acceso vigente.",
  ];
  return {
    subject: `[ICE24 OS] ${heading}`,
    text: [
      heading,
      "",
      ...paragraphs,
      "",
      ...actions.map(([label, href]) => `${label}: ${href}`),
      "",
      FOOTER,
    ].join("\n"),
    html: layout(heading, paragraphs, actions),
  };
}

const RENDERERS: Record<
  EmailTemplateKey,
  Record<number, (vars: never, context: RenderContext) => RenderedEmail>
> = {
  "alert.critical": { 1: criticalAlertV1 },
  "report.scheduled": { 1: scheduledReportV1 },
};

/** Renders `key@version`; any unknown template or invalid variable throws EmailTemplateError. */
export function renderEmail(
  key: string,
  version: number,
  variables: unknown,
  context: RenderContext,
): RenderedEmail {
  const parsedKey = emailTemplateKeySchema.safeParse(key);
  const render = parsedKey.success ? RENDERERS[parsedKey.data][version] : undefined;
  if (!parsedKey.success || render === undefined) throw new EmailTemplateError();
  let parsed: Record<string, unknown>;
  try {
    parsed = parseEmailTemplateVariables(parsedKey.data, version, variables);
  } catch {
    throw new EmailTemplateError();
  }
  return render(parsed as never, context);
}

/** Template versions with a renderer; must match EMAIL_TEMPLATES (unit test). */
export const RENDERED_TEMPLATE_VERSIONS = Object.entries(RENDERERS).flatMap(([key, versions]) =>
  Object.keys(versions).map((version) => `${key}@${version}`),
);
