import { useState, type ReactNode } from "react"
import CalculadoraPage from "@/features/pagadores/pages/CalculadoraPage"
import { BONO_FAMILIA, CLASES_GRUPO, MATRICULA, PRECIO_PRIVADA_HORA, PRECIO_PRIVADA_PROFESIONAL_HORA, euros, type Tramo } from "../tarifa"

// Versión web de "Guía interna de precios — Curso 2026/2027" para que
// recepción la consulte desde la plataforma sin tener que buscar el Word.
// Contenido estático a propósito (igual que el documento): son tarifas
// fijas del curso, no datos que vengan de la base de datos. Las cifras salen
// de ../tarifa.ts, que replica los PDF de precios que reciben las familias.

function TablaPrecios({ titulo, filas }: { titulo: string; filas: Tramo[] }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <p className="font-label text-[14px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-2">{titulo}</p>
      <div className="overflow-x-auto rounded-[12px] border border-pine-900/15">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="bg-pine-900 text-khaki-100 font-label text-[13px] uppercase tracking-[0.08em]">
              <th className="px-3.5 py-2.5 text-left font-semibold">Días/semana</th>
              <th className="px-3.5 py-2.5 text-left font-semibold">Precio/mes</th>
              <th className="px-3.5 py-2.5 text-left font-semibold">Horas/semana</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.dias} className="odd:bg-white even:bg-khaki-100 border-t border-pine-900/10">
                <td className="px-3.5 py-2.5">{f.dias} día{f.dias === 1 ? "" : "s"}</td>
                <td className="px-3.5 py-2.5 font-semibold text-pine-900">{euros(f.precio)}</td>
                <td className="px-3.5 py-2.5">{f.horas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Seccion({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="card !bg-white p-5 mb-5">
      <h2 className="font-head text-[22px] leading-tight text-pine-900 border-b-2 border-brass-500 pb-2 mb-4">
        {n}. {titulo}
      </h2>
      {children}
    </section>
  )
}

const TABS = [
  { id: "guia", label: "Guía de precios" },
  { id: "calculadora", label: "Calculadora de cobros" },
] as const
type TabId = (typeof TABS)[number]["id"]

export default function PreciosPage() {
  const [tab, setTab] = useState<TabId>("guia")

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="page-title">Precios — Rangers Academy · Curso 2026/2027</h1>
        <p className="page-subtitle">
          Guía interna para explicar los precios a las familias, y el cotizador rápido para consultas nuevas.
        </p>
      </div>

      <div className="bg-khaki-100 border border-pine-900/10 rounded-[10px] px-4 py-3 mb-6 text-[14px] text-ink">
        Estas tarifas son de <strong>Rangers Academy</strong> (clases de niños/adolescentes en grupo). <strong>Cami&amp;Co</strong> se cotiza caso por caso, no sigue esta tabla — para eso, consultá directamente con Cami.
      </div>

      <div className="flex gap-2 mb-6 border-b border-khaki-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-4 font-label text-[15px] font-semibold rounded-t-[10px] border-b-[3px] -mb-px transition-colors ${
              tab === t.id
                ? "text-pine-900 border-brass-500"
                : "text-ink-soft border-transparent hover:text-pine-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calculadora" ? <CalculadoraPage /> : <GuiaDePrecios />}
    </div>
  )
}

function GuiaDePrecios() {
  return (
    <div>
      <Seccion n={1} titulo="Lo básico">
        <ul className="list-disc list-inside space-y-1.5 text-[15px] text-ink">
          <li><strong>Clases Grupo</strong>: precio por alumno y mes, en grupo reducido.</li>
          <li><strong>Bono Familia</strong>: precio conjunto para 2 hermanos/as que vienen los mismos días y con la misma duración.</li>
          <li>Duración de sesión: clases de <strong>1 hora</strong> (de 1 a 5 días por semana) o de <strong>90 minutos</strong> (de 1 a 3 días por semana). No hay clases de 2 horas.</li>
          <li>Los grupos de 90 minutos casi siempre los da Cami — no es exclusivo, pero si preguntan específicamente por ese formato, lo normal es que sea con ella.</li>
          <li>Matrícula de inscripción: pago único de <strong>{euros(MATRICULA)}</strong>, aparte de la cuota mensual y exenta de IVA. Se puede aplicar descuento (50 %, gratis u otro importe).</li>
          <li>Cuantos más días a la semana, menos sale cada clase.</li>
          <li>Grupos de máximo 5 alumnos.</li>
        </ul>
      </Seccion>

      <Seccion n={2} titulo="Clases Grupo (por alumno)">
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={CLASES_GRUPO[60]} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={CLASES_GRUPO[90]} />
        </div>
      </Seccion>

      <Seccion n={3} titulo="Bono Familia (2 hermanos)">
        <p className="text-[15px] text-ink mb-3">
          Precio conjunto al mes para los dos hermanos, tal cual aparece en la tarifa. Si los hermanos vienen distintos días o con distinta duración, o son 3 o más, no está en la tarifa: confirmar el precio con Cami.
        </p>
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={BONO_FAMILIA[60]} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={BONO_FAMILIA[90]} />
        </div>
      </Seccion>

      <Seccion n={4} titulo="1 hora vs 90 minutos — cómo explicarlo">
        <p className="text-[15px] text-ink">
          El pack de 90 minutos cuesta más al mes (son más horas), pero <strong>por hora de clase</strong> sale igual o más barato que el de 1 hora. Buen argumento cuando una familia duda entre las dos duraciones.
        </p>
      </Seccion>

      <Seccion n={5} titulo="Clases particulares">
        <ul className="list-disc list-inside space-y-1.5 text-[15px] text-ink mb-3">
          <li>Clase privada: <strong>{euros(PRECIO_PRIVADA_HORA)}/hora</strong>.</li>
          <li>Clase privada profesional o de especialización (inglés para el ámbito profesional del alumno: ingeniería, salud, leyes, etc.): <strong>{euros(PRECIO_PRIVADA_PROFESIONAL_HORA)}/hora</strong>.</li>
        </ul>
        <p className="text-[15px] text-ink">Antes de dar un precio cerrado, pedir: nivel actual, plazo/fecha límite, título o certificación que preparan, si usan libro propio, horario preferido, online o presencial.</p>
      </Seccion>

      <p className="text-[14px] text-ink-soft italic">
        Ante cualquier duda que no sepas resolver en el momento, confirma por WhatsApp antes que dar un dato incorrecto.
      </p>
    </div>
  )
}
