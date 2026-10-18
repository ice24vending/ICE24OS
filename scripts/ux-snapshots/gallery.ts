/**
 * Static HTML gallery of the UX review captures (opened with a double click, no server).
 * F6-05: routes grouped by section, a navigable index and simple filters (section, screen,
 * viewport, state). Without JavaScript every capture stays visible.
 */
import {
  REVIEW_SECTIONS,
  type ReviewRoute,
  type ReviewSection,
  type ReviewViewport,
} from "../../tests/visual/ux-review.routes";

export interface Capture {
  readonly route: string;
  readonly state: string;
  readonly viewport: string;
  readonly file: string;
  readonly status: number | null;
  readonly problems: readonly string[];
}

export interface GalleryInput {
  readonly routes: readonly ReviewRoute[];
  readonly viewports: readonly ReviewViewport[];
  readonly captures: readonly Capture[];
  readonly generatedAt: Date;
  readonly commit: string;
}

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const sectionOf = (route: ReviewRoute): ReviewSection => route.section ?? "pantallas";

/** State filter options: one per state id, labeled by its first use ("normal" is generic). */
export const stateOptions = (routes: readonly ReviewRoute[]) => {
  const options = new Map<string, string>([["normal", "Normal"]]);
  for (const route of routes)
    for (const state of route.states)
      if (!options.has(state.id)) options.set(state.id, state.label);
  return [...options];
};

const STYLE = `
:root{color-scheme:light;--ink:#17212b;--muted:#52616f;--line:#c7d0d9;--brand:#04144c;--accent:#0455c4;--warn:#875900}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#f5f7f9}
header{padding:24px 16px;background:var(--brand);color:#fff}header h1{margin:0 0 8px;font-size:1.6rem}
header p{margin:4px 0;max-width:70ch}main{padding:16px;max-width:1500px;margin:0 auto}
.filters{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:0 -16px;padding:12px 16px;border-bottom:1px solid var(--line);background:#fff}
.filters label{display:grid;gap:4px;font-size:.85rem;font-weight:bold}.filters select,.filters button{min-height:44px;padding:6px 10px;border:1px solid var(--muted);border-radius:8px;background:#fff;color:var(--ink);font:inherit;font-weight:normal}
.filters button{color:var(--accent);font-weight:bold;cursor:pointer}.count{margin:0;color:var(--muted);font-size:.9rem}
.index h2{margin:16px 0 4px;font-size:1rem}nav ul{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}nav a{display:inline-block;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--accent);text-decoration:none}
h2.section{margin:32px 0 0;padding-bottom:4px;border-bottom:2px solid var(--brand);color:var(--brand)}
section.route{margin:24px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#fff}
section.route h3{margin:0}.path{font-family:monospace;color:var(--muted)}.review{margin:8px 0 0;padding:8px 12px;border-left:4px solid var(--accent);background:#eef4fc}
h4{margin:20px 0 8px;font-size:1.05rem}.shots{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
figure{margin:0;width:min(100%,260px)}figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px}
figcaption{margin-top:4px;font-size:.85rem;color:var(--muted)}.problem{color:#a12622;font-size:.85rem}
[hidden]{display:none!important}
a:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
`;

/** Shows only the captures that match every filter and hides empty groups. Inline, no network. */
const SCRIPT = `
(() => {
  const form = document.getElementById("filters");
  const count = document.getElementById("count");
  const figures = [...document.querySelectorAll("figure[data-route]")];
  const apply = () => {
    const values = Object.fromEntries(new FormData(form));
    let shown = 0;
    for (const figure of figures) {
      const visible = ["section", "route", "viewport", "state"].every(
        (key) => !values[key] || figure.dataset[key] === values[key],
      );
      figure.hidden = !visible;
      if (visible) shown += 1;
    }
    for (const group of document.querySelectorAll(".state-group, section.route, .section-block"))
      group.hidden = !group.querySelector("figure:not([hidden])");
    count.textContent = shown === figures.length
      ? "Mostrando las " + shown + " capturas."
      : "Mostrando " + shown + " de " + figures.length + " capturas.";
  };
  form.addEventListener("change", apply);
  form.addEventListener("reset", () => setTimeout(apply));
  apply();
})();
`;

const option = (value: string, label: string) =>
  `<option value="${escape(value)}">${escape(label)}</option>`;

export function renderGallery(input: GalleryInput): string {
  const viewportLabel = new Map(input.viewports.map((v) => [v.id, v.label]));
  const problems = input.captures.filter((capture) => capture.problems.length > 0).length;
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(input.generatedAt);
  const sections = (Object.keys(REVIEW_SECTIONS) as ReviewSection[])
    .map((section) => ({
      section,
      routes: input.routes.filter((route) => sectionOf(route) === section),
    }))
    .filter((group) => group.routes.length > 0);

  const renderRoute = (route: ReviewRoute) => {
    const section = sectionOf(route);
    const states = route.states
      .map((state) => {
        const shots = input.captures
          .filter((capture) => capture.route === route.id && capture.state === state.id)
          .map((capture) => {
            const label = viewportLabel.get(capture.viewport) ?? capture.viewport;
            const alt = `${route.title} · ${state.label} · ${label}`;
            return `<figure data-section="${section}" data-route="${escape(route.id)}" data-viewport="${escape(capture.viewport)}" data-state="${escape(state.id)}"><a href="img/${escape(capture.file)}"><img loading="lazy" src="img/${escape(capture.file)}" alt="${escape(alt)}"></a><figcaption>${escape(label)}${capture.problems.map((p) => `<br><span class="problem">⚠ ${escape(p)}</span>`).join("")}</figcaption></figure>`;
          })
          .join("");
        return `<div class="state-group"><h4>${escape(state.label)}</h4><div class="shots">${shots}</div></div>`;
      })
      .join("");
    return `<section class="route" id="${escape(route.id)}"><h3>${escape(route.title)}</h3><p class="path">${escape(route.path)}</p><p class="review"><strong>Qué revisar:</strong> ${escape(route.review)}</p>${states}</section>`;
  };

  const body = sections
    .map(
      ({ section, routes }) =>
        `<div class="section-block"><h2 class="section" id="seccion-${section}">${escape(REVIEW_SECTIONS[section])}</h2>${routes.map(renderRoute).join("")}</div>`,
    )
    .join("");
  const index = sections
    .map(
      ({ section, routes }) =>
        `<h2><a href="#seccion-${section}">${escape(REVIEW_SECTIONS[section])}</a></h2><ul>${routes.map((route) => `<li><a href="#${escape(route.id)}">${escape(route.title)}</a></li>`).join("")}</ul>`,
    )
    .join("");
  const filters = `<form id="filters" class="filters" aria-label="Filtrar capturas">
<label>Sección<select name="section">${option("", "Todas")}${sections.map(({ section }) => option(section, REVIEW_SECTIONS[section])).join("")}</select></label>
<label>Pantalla o componente<select name="route">${option("", "Todas")}${input.routes.map((route) => option(route.id, route.title)).join("")}</select></label>
<label>Tamaño<select name="viewport">${option("", "Todos")}${input.viewports.map((viewport) => option(viewport.id, viewport.label)).join("")}</select></label>
<label>Estado<select name="state">${option("", "Todos")}${stateOptions(input.routes)
    .map(([id, label]) => option(id, label))
    .join("")}</select></label>
<button type="reset">Quitar filtros</button>
<p id="count" class="count" role="status" aria-live="polite">${input.captures.length} capturas.</p>
</form>`;
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galería UX ICE24 OS</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>Galería de revisión UX · ICE24 OS</h1>
<p>Capturas de cada pantalla en móvil, tableta y escritorio, y en cada estado (normal, carga, error, sin permiso, modo lectura y sin conexión), más los componentes del catálogo y su matriz de estados. Todos los datos son ficticios.</p>
<p>Generada el ${escape(date)} · versión <code>${escape(input.commit)}</code> · ${input.captures.length} capturas${problems ? ` · ${problems} con observaciones` : ""}.</p>
<p>Usa los filtros para ver, por ejemplo, solo el móvil o solo el modo lectura. Haz clic en una imagen para verla completa.</p>
</header>
<main>
${filters}
<nav class="index" aria-label="Índice">${index}</nav>
${body}
</main>
<script>${SCRIPT}</script>
</body>
</html>
`;
}
