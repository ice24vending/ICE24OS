/** Static HTML gallery of the UX review captures (opened with a double click, no server). */
import type { ReviewRoute, ReviewViewport } from "../../tests/visual/ux-review.routes";

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

const STYLE = `
:root{color-scheme:light;--ink:#17212b;--muted:#52616f;--line:#c7d0d9;--brand:#04144c;--accent:#0455c4;--warn:#875900}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#f5f7f9}
header{padding:24px 16px;background:var(--brand);color:#fff}header h1{margin:0 0 8px;font-size:1.6rem}
header p{margin:4px 0;max-width:70ch}main{padding:16px;max-width:1500px;margin:0 auto}
nav ul{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}nav a{display:inline-block;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--accent);text-decoration:none}
section.route{margin:24px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#fff}
section.route h2{margin:0}.path{font-family:monospace;color:var(--muted)}.review{margin:8px 0 0;padding:8px 12px;border-left:4px solid var(--accent);background:#eef4fc}
h3{margin:20px 0 8px;font-size:1.05rem}.shots{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
figure{margin:0;width:min(100%,260px)}figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px}
figcaption{margin-top:4px;font-size:.85rem;color:var(--muted)}.problem{color:#a12622;font-size:.85rem}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
`;

export function renderGallery(input: GalleryInput): string {
  const viewportLabel = new Map(input.viewports.map((v) => [v.id, v.label]));
  const problems = input.captures.filter((capture) => capture.problems.length > 0).length;
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(input.generatedAt);
  const sections = input.routes
    .map((route) => {
      const states = route.states
        .map((state) => {
          const shots = input.captures
            .filter((capture) => capture.route === route.id && capture.state === state.id)
            .map((capture) => {
              const label = viewportLabel.get(capture.viewport) ?? capture.viewport;
              const alt = `${route.title} · ${state.label} · ${label}`;
              return `<figure><a href="img/${escape(capture.file)}"><img loading="lazy" src="img/${escape(capture.file)}" alt="${escape(alt)}"></a><figcaption>${escape(label)}${capture.problems.map((p) => `<br><span class="problem">⚠ ${escape(p)}</span>`).join("")}</figcaption></figure>`;
            })
            .join("");
          return `<h3>${escape(state.label)}</h3><div class="shots">${shots}</div>`;
        })
        .join("");
      return `<section class="route" id="${escape(route.id)}"><h2>${escape(route.title)}</h2><p class="path">${escape(route.path)}</p><p class="review"><strong>Qué revisar:</strong> ${escape(route.review)}</p>${states}</section>`;
    })
    .join("");
  const index = input.routes
    .map((route) => `<li><a href="#${escape(route.id)}">${escape(route.title)}</a></li>`)
    .join("");
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
<p>Capturas de cada pantalla en móvil, tableta y escritorio, y en cada estado (normal, carga, error, sin permiso, modo lectura y sin conexión). Todos los datos son ficticios.</p>
<p>Generada el ${escape(date)} · versión <code>${escape(input.commit)}</code> · ${input.captures.length} capturas${problems ? ` · ${problems} con observaciones` : ""}.</p>
<p>Haz clic en una imagen para verla completa.</p>
</header>
<main>
<nav aria-label="Pantallas"><ul>${index}</ul></nav>
${sections}
</main>
</body>
</html>
`;
}
