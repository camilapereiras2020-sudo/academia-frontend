import { useState, type ReactNode } from "react"
import CalculadoraPage from "@/features/pagadores/pages/CalculadoraPage"

// Versión web de "Guía interna de precios — Curso 2026/2027" para que
// recepción la consulte desde la plataforma sin tener que buscar el Word.
// Contenido estático a propósito (igual que el documento): son tarifas
// fijas del curso, no datos que vengan de la base de datos. Si cambian de
// curso, se actualiza aquí y en modules/tarifas/pricing.py (backend) a la vez.

interface FilaPrecio { dias: string; precio: string; descuento: string; horas: string }

const GRUPO_1H: FilaPrecio[] = [
  { dias: "1 día", precio: "50€", descuento: "0%", horas: "1h" },
  { dias: "2 días", precio: "95€", descuento: "3%", horas: "2h" },
  { dias: "3 días", precio: "145€", descuento: "5%", horas: "3h" },
  { dias: "4 días", precio: "185€", descuento: "7%", horas: "4h" },
  { dias: "5 días", precio: "230€", descuento: "9%", horas: "5h" },
]
const GRUPO_90: FilaPrecio[] = [
  { dias: "1 día", precio: "72€", descuento: "0%", horas: "1h30" },
  { dias: "2 días", precio: "140€", descuento: "3%", horas: "3h" },
  { dias: "3 días", precio: "205€", descuento: "5%", horas: "4h30" },
  { dias: "4 días", precio: "268€", descuento: "7%", horas: "6h" },
  { dias: "5 días", precio: "328€", descuento: "9%", horas: "7h30" },
]
const FAMILIA_1H: FilaPrecio[] = [
  { dias: "1 día", precio: "95€", descuento: "5%", horas: "1h" },
  { dias: "2 días", precio: "180€", descuento: "5%", horas: "2h" },
  { dias: "3 días", precio: "275€", descuento: "5%", horas: "3h" },
  { dias: "4 días", precio: "350€", descuento: "5%", horas: "4h" },
  { dias: "5 días", precio: "435€", descuento: "5%", horas: "5h" },
]
const FAMILIA_90: FilaPrecio[] = [
  { dias: "1 día", precio: "137€", descuento: "5%", horas: "1h30" },
  { dias: "2 días", precio: "266€", descuento: "5%", horas: "3h" },
  { dias: "3 días", precio: "390€", descuento: "5%", horas: "4h30" },
  { dias: "4 días", precio: "509€", descuento: "5%", horas: "6h" },
  { dias: "5 días", precio: "623€", descuento: "5%", horas: "7h30" },
]
const FAMILIA_1H_3: FilaPrecio[] = [
  { dias: "1 día", precio: "145€", descuento: "5%", horas: "1h" },
  { dias: "2 días", precio: "270€", descuento: "5%", horas: "2h" },
  { dias: "3 días", precio: "415€", descuento: "5%", horas: "3h" },
  { dias: "4 días", precio: "525€", descuento: "5%", horas: "4h" },
  { dias: "5 días", precio: "655€", descuento: "5%", horas: "5h" },
]
const FAMILIA_90_3: FilaPrecio[] = [
  { dias: "1 día", precio: "205€", descuento: "5%", horas: "1h30" },
  { dias: "2 días", precio: "399€", descuento: "5%", horas: "3h" },
  { dias: "3 días", precio: "584€", descuento: "5%", horas: "4h30" },
  { dias: "4 días", precio: "764€", descuento: "5%", horas: "6h" },
  { dias: "5 días", precio: "935€", descuento: "5%", horas: "7h30" },
]
const FAMILIA_1H_4: FilaPrecio[] = [
  { dias: "1 día", precio: "190€", descuento: "5%", horas: "1h" },
  { dias: "2 días", precio: "360€", descuento: "5%", horas: "2h" },
  { dias: "3 días", precio: "550€", descuento: "5%", horas: "3h" },
  { dias: "4 días", precio: "705€", descuento: "5%", horas: "4h" },
  { dias: "5 días", precio: "875€", descuento: "5%", horas: "5h" },
]
const FAMILIA_90_4: FilaPrecio[] = [
  { dias: "1 día", precio: "274€", descuento: "5%", horas: "1h30" },
  { dias: "2 días", precio: "532€", descuento: "5%", horas: "3h" },
  { dias: "3 días", precio: "779€", descuento: "5%", horas: "4h30" },
  { dias: "4 días", precio: "1.018€", descuento: "5%", horas: "6h" },
  { dias: "5 días", precio: "1.246€", descuento: "5%", horas: "7h30" },
]

function TablaPrecios({ titulo, filas }: { titulo: string; filas: FilaPrecio[] }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <p className="font-semibold text-pine-900 mb-2">{titulo}</p>
      <div className="overflow-x-auto rounded-lg border border-khaki-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pine-700 text-white text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold">Días/sem</th>
              <th className="px-3 py-2 text-left font-semibold">Precio/mes</th>
              <th className="px-3 py-2 text-left font-semibold">% desc.</th>
              <th className="px-3 py-2 text-left font-semibold">Horas/sem</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.dias} className="odd:bg-white even:bg-khaki-50 border-t border-khaki-100">
                <td className="px-3 py-2">{f.dias}</td>
                <td className="px-3 py-2 font-semibold text-pine-900">{f.precio}</td>
                <td className="px-3 py-2">{f.descuento}</td>
                <td className="px-3 py-2">{f.horas}</td>
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
    <section className="bg-white rounded-xl shadow-sm border border-khaki-200 p-5 mb-5">
      <h2 className="font-head font-normal text-xl text-pine-900 border-b-2 border-brass-500 pb-2 mb-4">
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
        <h1 className="font-head font-normal text-3xl text-pine-900">Precios — Rangers Academy · Curso 2026/2027</h1>
        <p className="text-sm text-pine-700 mt-1">
          Guía interna para explicar los precios a las familias, y el cotizador rápido para consultas nuevas.
        </p>
      </div>

      <div className="bg-khaki-50 border border-khaki-200 rounded-lg px-3 py-2 mb-6 text-xs text-pine-700">
        Estas tarifas son de <strong>Rangers Academy</strong> (clases de niños/adolescentes en grupo). <strong>Cami&amp;Co</strong> se cotiza caso por caso, no sigue esta tabla — para eso, consultá directamente con Cami.
      </div>

      <div className="flex gap-2 mb-6 border-b border-khaki-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "text-pine-900 border-brass-500"
                : "text-khaki-500 border-transparent hover:text-pine-700"
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
        <ul className="list-disc list-inside space-y-1.5 text-sm text-pine-800">
          <li><strong>Clases Grupo</strong>: precio por alumno, en grupo reducido.</li>
          <li><strong>Bono Familia</strong>: precio conjunto para 2, 3 o 4 hermanos/as matriculados — siempre un 5% más barato que pagar esas matrículas de Clases Grupo por separado.</li>
          <li>Duración de sesión: clases de <strong>1 hora</strong> o de <strong>90 minutos</strong>. El alumno/familia elige una de las dos, no se mezclan.</li>
          <li>Los grupos de 90 minutos casi siempre los da Cami — no es exclusivo, pero si preguntan específicamente por ese formato, lo normal es que sea con ella.</li>
          <li>Matrícula de inscripción: pago único de <strong>20€</strong>, aparte de la cuota mensual.</li>
          <li>El precio baja un poco cuantos más días a la semana venga el alumno (descuento por volumen, máximo 9%).</li>
          <li>Grupos de máximo 5 alumnos.</li>
        </ul>
      </Seccion>

      <Seccion n={2} titulo="Precios — Clases Grupo (1 alumno)">
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={GRUPO_1H} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={GRUPO_90} />
        </div>
        <p className="text-xs text-khaki-500 italic mt-3">
          El % descuento aquí es solo por venir más días a la semana (no tiene relación con el Bono Familia).
        </p>
      </Seccion>

      <Seccion n={3} titulo="Precios — Bono Familia (2 hermanos)">
        <p className="text-sm text-pine-800 mb-3">
          Parte siempre del precio de Clases Grupo × 2 (un precio por cada hermano), con un 5% de descuento fijo por ser familia — el mismo 5% en todos los tramos.
        </p>
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={FAMILIA_1H} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={FAMILIA_90} />
        </div>
      </Seccion>

      <Seccion n={4} titulo="Precios — Bono Familia (3 hermanos)">
        <p className="text-sm text-pine-800 mb-3">
          Parte siempre del precio de Clases Grupo × 3, con el mismo 5% de descuento fijo por familia.
        </p>
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={FAMILIA_1H_3} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={FAMILIA_90_3} />
        </div>
      </Seccion>

      <Seccion n={5} titulo="Precios — Bono Familia (4 hermanos)">
        <p className="text-sm text-pine-800 mb-3">
          Parte siempre del precio de Clases Grupo × 4, con el mismo 5% de descuento fijo por familia.
        </p>
        <div className="flex flex-wrap gap-6">
          <TablaPrecios titulo="Clases de 1 hora" filas={FAMILIA_1H_4} />
          <TablaPrecios titulo="Clases de 90 minutos" filas={FAMILIA_90_4} />
        </div>
      </Seccion>

      <Seccion n={6} titulo="1 hora vs 90 minutos — cómo explicarlo">
        <p className="text-sm text-pine-800">
          El pack de 90 minutos siempre cuesta más en total al mes (son más horas), pero calculado <strong>por hora de clase</strong> siempre sale más barato que el de 1 hora — los 30 minutos extra no se cobran al precio completo. Buen argumento cuando una familia duda entre las dos duraciones.
        </p>
      </Seccion>

      <Seccion n={7} titulo="Clases particulares para profesionales">
        <p className="text-sm text-pine-800 mb-2">
          Clases privadas de inglés para adultos, enfocadas en el ámbito profesional del alumno (ingeniería, salud, leyes, etc.), a medida según el sector.
        </p>
        <p className="text-sm font-semibold text-pine-900">Precio: 35€/hora.</p>
        <p className="text-sm text-pine-800 mt-2">Antes de dar un precio cerrado, pedir: nivel actual, plazo/fecha límite, título o certificación que preparan, si usan libro propio, horario preferido, online o presencial.</p>
      </Seccion>

      <p className="text-xs text-khaki-500 italic">
        Ante cualquier duda que no sepas resolver en el momento, confirma por WhatsApp antes que dar un dato incorrecto.
      </p>
    </div>
  )
}

