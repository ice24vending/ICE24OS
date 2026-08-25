import { StatusPanel } from "@ice24/ui";

const states = [
  {
    title: "Cargando",
    tone: "info" as const,
    role: "status" as const,
    content: "Preparando el contexto autorizado…",
  },
  {
    title: "Sin información",
    tone: "neutral" as const,
    content: "Todavía no existen registros disponibles para este contexto.",
  },
  {
    title: "Error recuperable",
    tone: "danger" as const,
    role: "alert" as const,
    content: "No fue posible cargar el módulo. Intenta nuevamente cuando exista conexión.",
  },
  {
    title: "Permiso denegado",
    tone: "warning" as const,
    role: "alert" as const,
    content: "Tu sesión no tiene autorización para consultar este recurso.",
  },
  {
    title: "Modo lectura",
    tone: "success" as const,
    content: "El contexto puede consultarse, pero las modificaciones están deshabilitadas.",
  },
];

export default function Home() {
  return (
    <main id="main-content" className="shell">
      <header className="hero">
        <p className="eyebrow">Fase 1 · Entorno fundacional</p>
        <h1>ICE24 OS</h1>
        <p>
          La aplicación privada está lista para recibir módulos autorizados. Esta pantalla no usa
          datos productivos.
        </p>
      </header>

      <section aria-labelledby="state-catalog-title">
        <h2 id="state-catalog-title" className="section-title">
          Estados base de interfaz
        </h2>
        <div className="state-grid">
          {states.map(({ title, tone, role, content }) => (
            <StatusPanel
              key={title}
              title={title}
              tone={tone}
              {...(role === undefined ? {} : { role })}
            >
              <p>{content}</p>
            </StatusPanel>
          ))}
        </div>
      </section>
    </main>
  );
}
