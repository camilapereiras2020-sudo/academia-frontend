import { useMemo, useState } from "react"

// Cotizador rápido para consultas de clientes nuevos (no depende de datos
// guardados en la plataforma — para eso están Alumnos/Pagadores). Recepción
// mete la situación del cliente y esto resalta el precio que corresponde.
// Embebida como pestaña dentro de PreciosPage (ruta /precios), por eso no
// tiene su propio <h1>. Mismos números que la guía — si cambian de curso,
// actualizar aquí y en modules/tarifas/pricing.py (backend) a la vez.

interface Tramo { dias: number; precio: number; descuento: number; horas: string }

const GRUPO: Record<60 | 90, Tramo[]> = {
  60: [
    { dias: 1, precio: 50, descuento: 0, horas: "1h" },
    { dias: 2, precio: 95, descuento: 3, horas: "2h" },
    { dias: 3, precio: 145, descuento: 5, horas: "3h" },
    { dias: 4, precio: 185, descuento: 7, horas: "4h" },
    { dias: 5, precio: 230, descuento: 9, horas: "5h" },
  ],
  90: [
    { dias: 1, precio: 72, descuento: 0, horas: "1h30" },
    { dias: 2, precio: 140, descuento: 3, horas: "3h" },
    { dias: 3, precio: 205, descuento: 5, horas: "4h30" },
    { dias: 4, precio: 268, descuento: 7, horas: "6h" },
    { dias: 5, precio: 328, descuento: 9, horas: "7h30" },
  ],
}

const FAMILIA: Record<2 | 3 | 4, Record<60 | 90, Tramo[]>> = {
  2: {
    60: [
      { dias: 1, precio: 95, descuento: 5, horas: "1h" },
      { dias: 2, precio: 180, descuento: 5, horas: "2h" },
      { dias: 3, precio: 275, descuento: 5, horas: "3h" },
      { dias: 4, precio: 350, descuento: 5, horas: "4h" },
      { dias: 5, precio: 435, descuento: 5, horas: "5h" },
    ],
    90: [
      { dias: 1, precio: 137, descuento: 5, horas: "1h30" },
      { dias: 2, precio: 266, descuento: 5, horas: "3h" },
      { dias: 3, precio: 390, descuento: 5, horas: "4h30" },
      { dias: 4, precio: 509, descuento: 5, horas: "6h" },
      { dias: 5, precio: 623, descuento: 5, horas: "7h30" },
    ],
  },
  3: {
    60: [
      { dias: 1, precio: 145, descuento: 5, horas: "1h" },
      { dias: 2, precio: 270, descuento: 5, horas: "2h" },
      { dias: 3, precio: 415, descuento: 5, horas: "3h" },
      { dias: 4, precio: 525, descuento: 5, horas: "4h" },
      { dias: 5, precio: 655, descuento: 5, horas: "5h" },
    ],
    90: [
      { dias: 1, precio: 205, descuento: 5, horas: "1h30" },
      { dias: 2, precio: 399, descuento: 5, horas: "3h" },
      { dias: 3, precio: 584, descuento: 5, horas: "4h30" },
      { dias: 4, precio: 764, descuento: 5, horas: "6h" },
      { dias: 5, precio: 935, descuento: 5, horas: "7h30" },
    ],
  },
  4: {
    60: [
      { dias: 1, precio: 190, descuento: 5, horas: "1h" },
      { dias: 2, precio: 360, descuento: 5, horas: "2h" },
      { dias: 3, precio: 550, descuento: 5, horas: "3h" },
      { dias: 4, precio: 705, descuento: 5, horas: "4h" },
      { dias: 5, precio: 875, descuento: 5, horas: "5h" },
    ],
    90: [
      { dias: 1, precio: 274, descuento: 5, horas: "1h30" },
      { dias: 2, precio: 532, descuento: 5, horas: "3h" },
      { dias: 3, precio: 779, descuento: 5, horas: "4h30" },
      { dias: 4, precio: 1018, descuento: 5, horas: "6h" },
      { dias: 5, precio: 1246, descuento: 5, horas: "7h30" },
    ],
  },
}

const MATRICULA = 20
const PRECIO_PRIVADA_HORA = 35

function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 === 0 ? 0 : 2 }) + "€"
}

type Tipo = "grupo" | "familia" | "privada"

export default function CalculadoraPage() {
  const [tipo, setTipo] = useState<Tipo>("grupo")
  const [dias, setDias] = useState(2)
  const [duracion, setDuracion] = useState<60 | 90>(60)
  const [hermanos, setHermanos] = useState<2 | 3 | 4>(2)
  const [horasSesionPrivada, setHorasSesionPrivada] = useState(1.5)
  const [diasSemanaPrivada, setDiasSemanaPrivada] = useState(1)

  const tabla = tipo === "familia" ? FAMILIA[hermanos][duracion] : GRUPO[duracion]
  const tramo = useMemo(() => tabla.find((t) => t.dias === dias), [tabla, dias])

  return (
    <div>
      <p className="text-sm text-pine-700 mb-4">
        Metele la situación del cliente y te resalto el precio que le corresponde. Para clases particulares de adultos, cambiá a esa pestaña.
      </p>

      <div className="flex gap-2 mb-5">
        {(
          [
            { id: "grupo", label: "1 alumno" },
            { id: "familia", label: "Hermanos (Bono Familia)" },
            { id: "privada", label: "Clase particular (adulto)" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTipo(t.id)}
            className={`px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
              tipo === t.id
                ? "bg-pine-900 border-pine-900 text-white"
                : "bg-white border-khaki-200 text-pine-700 hover:border-pine-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tipo !== "privada" ? (
        <>
          <div className="flex flex-wrap gap-6 mb-5">
            {tipo === "familia" && (
              <div>
                <label className="block text-xs font-semibold text-pine-700 mb-1">Nº de hermanos/as</label>
                <div className="flex gap-1.5">
                  {([2, 3, 4] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHermanos(h)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        hermanos === h
                          ? "bg-brass-500 border-brass-700 text-pine-900"
                          : "bg-white border-khaki-200 text-pine-700 hover:border-brass-400"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Días a la semana</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDias(d)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      dias === d
                        ? "bg-brass-500 border-brass-700 text-pine-900"
                        : "bg-white border-khaki-200 text-pine-700 hover:border-brass-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Duración de la clase</label>
              <div className="flex gap-1.5">
                {([60, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuracion(d)}
                    className={`px-3 h-9 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      duracion === d
                        ? "bg-brass-500 border-brass-700 text-pine-900"
                        : "bg-white border-khaki-200 text-pine-700 hover:border-brass-400"
                    }`}
                  >
                    {d === 60 ? "1 hora" : "90 min"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tramo && (
            <div className="bg-pine-900 text-white rounded-xl p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-brass-300 font-semibold">
                  {tipo === "familia" ? `Bono Familia (${hermanos} hermanos)` : "Clase Grupo (1 alumno)"}
                </p>
                <p className="text-sm text-khaki-200 mt-1">
                  {dias} día{dias === 1 ? "" : "s"}/semana · {duracion === 60 ? "1 hora" : "90 min"} · {tramo.horas}/semana
                  {tramo.descuento > 0 && ` · ${tramo.descuento}% desc.`}
                </p>
                <p className="text-xs text-khaki-300 mt-1">+ {euros(MATRICULA)} de matrícula (pago único, primera vez)</p>
              </div>
              <p className="text-3xl font-bold text-brass-300">{euros(tramo.precio)}<span className="text-sm text-khaki-200 font-normal">/mes</span></p>
            </div>
          )}

          {duracion === 90 && (
            <p className="text-xs text-pine-700 bg-khaki-50 border border-khaki-200 rounded-lg px-3 py-2 mb-5">
              💡 Los grupos de 90 minutos casi siempre los da Cami — no es exclusivo, pero si preguntan específicamente por este formato, decí que lo normal es que sea con ella.
            </p>
          )}

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
                {tabla.map((t) => (
                  <tr
                    key={t.dias}
                    className={
                      t.dias === dias
                        ? "bg-brass-100 border-t-2 border-b-2 border-brass-500 font-semibold"
                        : "odd:bg-white even:bg-khaki-50 border-t border-khaki-100"
                    }
                  >
                    <td className="px-3 py-2">{t.dias} día{t.dias === 1 ? "" : "s"}</td>
                    <td className="px-3 py-2 text-pine-900">{euros(t.precio)}</td>
                    <td className="px-3 py-2">{t.descuento}%</td>
                    <td className="px-3 py-2">{t.horas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <PrivadaCalculadora
          horasSesion={horasSesionPrivada}
          setHorasSesion={setHorasSesionPrivada}
          diasSemana={diasSemanaPrivada}
          setDiasSemana={setDiasSemanaPrivada}
        />
      )}
    </div>
  )
}

function PrivadaCalculadora({
  horasSesion, setHorasSesion, diasSemana, setDiasSemana,
}: {
  horasSesion: number; setHorasSesion: (n: number) => void
  diasSemana: number; setDiasSemana: (n: number) => void
}) {
  const horasSemana = horasSesion * diasSemana
  const totalSemana = horasSemana * PRECIO_PRIVADA_HORA
  const totalMesAprox = totalSemana * 4

  return (
    <div>
      <div className="flex flex-wrap gap-6 mb-5">
        <div>
          <label className="block text-xs font-semibold text-pine-700 mb-1">Horas por sesión</label>
          <input
            type="number" min={0.5} step={0.5} value={horasSesion}
            onChange={(e) => setHorasSesion(Math.max(0.5, Number(e.target.value) || 0))}
            className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-pine-700 mb-1">Días por semana</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setDiasSemana(d)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  diasSemana === d
                    ? "bg-brass-500 border-brass-700 text-pine-900"
                    : "bg-white border-khaki-200 text-pine-700 hover:border-brass-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-pine-900 text-white rounded-xl p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-brass-300 font-semibold">Clase particular (adulto)</p>
          <p className="text-sm text-khaki-200 mt-1">
            {horasSesion}h × {diasSemana} día{diasSemana === 1 ? "" : "s"}/sem = {horasSemana}h/semana a {euros(PRECIO_PRIVADA_HORA)}/hora
          </p>
          <p className="text-xs text-khaki-300 mt-1">Estimado a 4 semanas/mes — precio final a medida según sector y objetivos.</p>
        </div>
        <p className="text-3xl font-bold text-brass-300">{euros(totalMesAprox)}<span className="text-sm text-khaki-200 font-normal">/mes aprox.</span></p>
      </div>

      <div className="bg-white rounded-xl border border-khaki-200 p-4">
        <p className="text-sm font-semibold text-pine-900 mb-2">Antes de cerrar el precio, pedir:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-pine-800">
          <li>Nivel actual de inglés (aproximado)</li>
          <li>Plazo o fecha límite (entrevista, proyecto, certificación concreta)</li>
          <li>Título o certificación que prepara (ej. Aviation English/ICAO)</li>
          <li>Si usa libro de texto o material propio</li>
          <li>Horario preferido</li>
          <li>Online o presencial</li>
        </ul>
      </div>
    </div>
  )
}
