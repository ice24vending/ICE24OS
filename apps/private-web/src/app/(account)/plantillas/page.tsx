import { ButtonLink, Card, PageHeader } from "@ice24/ui";

import { requireTemplates } from "../../../server/demo/templates";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    href: "/plantillas/lista",
    title: "Lista",
    text: "Máquinas con filtros, tabla que se vuelve tarjetas en el celular y paginación.",
  },
  {
    href: "/plantillas/detalle",
    title: "Detalle",
    text: "Expediente de una máquina: estados, acciones, resumen, pestañas e historial.",
  },
  {
    href: "/plantillas/asistente",
    title: "Flujo por pasos",
    text: "Solicitud de alta en tres pasos con validación por paso y revisión final.",
  },
  {
    href: "/plantillas/panel",
    title: "Dashboard",
    text: "Indicadores del día, alertas y tareas en una rejilla que se adapta al ancho.",
  },
  {
    href: "/plantillas/campo",
    title: "Pantalla de campo",
    text: "Orden de trabajo para una mano y con guantes; se puede guardar sin red.",
  },
] as const;

/** Index of the demo-only «Plantillas» (F6-09/F6-10): one example screen per layout. */
export default async function TemplatesPage() {
  await requireTemplates();
  return (
    <main id="main-content" className="private-shell template-screen">
      <PageHeader
        eyebrow="Solo en modo demo"
        title="Plantillas"
        description="Una pantalla de ejemplo por layout, con datos ficticios de máquinas de hielo. Con el panel Demo se fuerza cada estado: «Conexión» (carga lenta, error, sin conexión), «Estado de la cuenta» (modo lectura) y «Escenario de plantillas» (vacío, sin permiso, conflicto)."
      />
      <ul className="template-index">
        {TEMPLATES.map((template) => (
          <li key={template.href}>
            <Card title={template.title} titleAs="h2">
              <p>{template.text}</p>
              <ButtonLink href={template.href} variant="secondary" size="sm">
                Abrir {template.title.toLowerCase()}
              </ButtonLink>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
