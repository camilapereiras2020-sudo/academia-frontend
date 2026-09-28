import { useState } from "react"
import {
  BONO_FAMILIA, CLASES_GRUPO, MATRICULA, PRECIO_PRIVADA_HORA, PRECIO_PRIVADA_PROFESIONAL_HORA,
  euros, type Duracion,
} from "@/features/tarifas/tarifa"

// Cotizador rápido para consultas de clientes nuevos (no depende de datos
// guardados en la plataforma — para eso están Alumnos/Pagadores). Recepción
// mete la situación del cliente y esto resalta el precio que corresponde.
// Embebida como pestaña dentro de PreciosPage (ruta /precios), por eso no
// tiene su propio <h1>. Las cifras salen de features/tarifas/tarifa.ts, la
// misma tarifa que reciben las familias en PDF.

type Tipo = "grupo" | "familia" | "privada"

const LABEL = "block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1.5"
const opcion = (activa: boolean) =>
  `min-w-[44px] h-11 px-3 rounded-[10px] font-label text-[15px] font-semibold border transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
    activa ? "bg-pine-900 border-pine-900 text-khaki-100" : "bg-white border-pine-900/20 text-pine-700 hover:bg-khaki-100"
  }`

export default function CalculadoraPage() {
  const [tipo, setTipo] = useState<Tipo>("grupo")
  const [dias, setDias] = useState(2)
  const [duracion, setDuracion] = useState<Duracion>(60)

  const tabla = tipo === "familia" ? BONO_FAMILIA[duracion] : CLASES_GRUPO[duracion]
  const maxDias = Math.max(...tabla.map((t) => t.dias))
  const tramo = tabla.find((t) => t.dias === dias)

  function elegirDuracion(d: Duracion) {
    setDuracion(d)
    const max = Math.max(...CLASES_GRUPO[d].map((t) => t.dias))
    if (dias > max) setDias(max)
  }

  return (
    <div>
      <p className="text-[15px] text-ink-soft mb-4">
        Introduce la situación del cliente y se resalta el precio que le corresponde según la tarifa.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(
          [
            { id: "grupo", label: "1 alumno" },
            { id: "familia", label: "2 hermanos (Bono Familia)" },
            { id: "privada", label: "Clase particular" },
          ] as const
        ).map((t) => (
          <button key={t.id} onClick={() => setTipo(t.id)} className={opcion(tipo === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tipo !== "privada" ? (
        <>
          <div className="flex flex-wrap gap-6 mb-5">
            <div>
              <span className={LABEL}>Duración de la clase</span>
              <div className="flex gap-1.5">
                {([60, 90] as const).map((d) => (
                  <button key={d} onClick={() => elegirDuracion(d)} className={opcion(duracion === d)}>
                    {d === 60 ? "1 hora" : "90 min"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={LABEL}>Días a la semana</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button key={d} onClick={() => setDias(d)} disabled={d > maxDias}
                    title={d > maxDias ? "No está en la tarifa" : undefined}
                    className={opcion(dias === d)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tramo && (
            <div className="bg-pine-900 text-khaki-100 rounded-[12px] p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-label text-[13px] uppercase tracking-[0.12em] text-brass-500 font-semibold">
                  {tipo === "familia" ? "Bono Familia (2 hermanos)" : "Clase Grupo (por alumno)"}
                </p>
                <p className="text-[15px] text-khaki-100/85 mt-1">
                  {dias} día{dias === 1 ? "" : "s"}/semana · {duracion === 60 ? "1 hora" : "90 min"} · {tramo.horas}/semana
                </p>
                <p className="text-[14px] text-khaki-100/70 mt-1">
                  + {euros(MATRICULA)} de matrícula por alumno (pago único al matricularse)
                </p>
              </div>
              <p className="font-head text-[32px] text-brass-500">
                {euros(tramo.precio)}<span className="font-body text-[15px] text-khaki-100/80">/mes</span>
              </p>
            </div>
          )}

          {tipo === "familia" && (
            <p className="text-[14px] text-ink bg-khaki-100 border border-pine-900/10 rounded-[10px] px-4 py-3 mb-5">
              El Bono Familia de la tarifa es para 2 hermanos que vienen los mismos días y con la misma duración. Si no es así, o son 3 o más, confirmar el precio con Cami.
            </p>
          )}

          {duracion === 90 && (
            <p className="text-[14px] text-ink bg-khaki-100 border border-pine-900/10 rounded-[10px] px-4 py-3 mb-5">
              Los grupos de 90 minutos son de 1 a 3 días por semana y casi siempre los da Cami — no es exclusivo, pero si preguntan específicamente por este formato, lo normal es que sea con ella.
            </p>
          )}

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
                {tabla.map((t) => (
                  <tr key={t.dias}
                    className={t.dias === dias
                      ? "bg-brass-300/40 font-semibold border-t border-brass-500"
                      : "odd:bg-white even:bg-khaki-100 border-t border-pine-900/10"}>
                    <td className="px-3.5 py-2.5">{t.dias} día{t.dias === 1 ? "" : "s"}</td>
                    <td className="px-3.5 py-2.5 text-pine-900">{euros(t.precio)}</td>
                    <td className="px-3.5 py-2.5">{t.horas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <PrivadaCalculadora />
      )}
    </div>
  )
}

function PrivadaCalculadora() {
  const [profesional, setProfesional] = useState(false)
  const [horasSesion, setHorasSesion] = useState(1)
  const [diasSemana, setDiasSemana] = useState(1)

  const precioHora = profesional ? PRECIO_PRIVADA_PROFESIONAL_HORA : PRECIO_PRIVADA_HORA
  const horasSemana = horasSesion * diasSemana
  const totalMesAprox = horasSemana * precioHora * 4

  return (
    <div>
      <div className="flex flex-wrap gap-6 mb-5">
        <div>
          <span className={LABEL}>Tipo de clase</span>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setProfesional(false)} className={opcion(!profesional)}>
              Privada · {euros(PRECIO_PRIVADA_HORA)}/h
            </button>
            <button onClick={() => setProfesional(true)} className={opcion(profesional)}>
              Profesional o especialización · {euros(PRECIO_PRIVADA_PROFESIONAL_HORA)}/h
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="privada-horas" className={LABEL}>Horas por sesión</label>
          <input id="privada-horas" type="number" min={0.5} step={0.5} value={horasSesion}
            onChange={(e) => setHorasSesion(Math.max(0.5, Number(e.target.value) || 0))}
            className="input !w-28" />
        </div>
        <div>
          <span className={LABEL}>Días por semana</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => (
              <button key={d} onClick={() => setDiasSemana(d)} className={opcion(diasSemana === d)}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-pine-900 text-khaki-100 rounded-[12px] p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-label text-[13px] uppercase tracking-[0.12em] text-brass-500 font-semibold">
            {profesional ? "Clase privada profesional o especialización" : "Clase privada"}
          </p>
          <p className="text-[15px] text-khaki-100/85 mt-1">
            {horasSesion} h × {diasSemana} día{diasSemana === 1 ? "" : "s"}/semana = {horasSemana} h/semana a {euros(precioHora)}/hora
          </p>
          <p className="text-[14px] text-khaki-100/70 mt-1">Estimado a 4 semanas/mes — el precio final se cierra a mano.</p>
        </div>
        <p className="font-head text-[32px] text-brass-500">
          {euros(totalMesAprox)}<span className="font-body text-[15px] text-khaki-100/80">/mes aprox.</span>
        </p>
      </div>

      <div className="card !bg-white p-4">
        <p className="font-label text-[14px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-2">Antes de cerrar el precio, pedir</p>
        <ul className="list-disc list-inside space-y-1 text-[15px] text-ink">
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
