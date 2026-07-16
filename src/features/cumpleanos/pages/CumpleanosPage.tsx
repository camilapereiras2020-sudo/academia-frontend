import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { alumnosApi } from "@/features/alumnos/alumnos_api"

interface Cumpleanos {
  id: number
  nombre: string
  fecha_nacimiento: string | null
  dias_para_cumpleanos: number
}

const WINDOW_OPTS = [7, 14, 30, 60, 90]

function urgencyClass(dias: number) {
  if (dias === 0) return "border-l-amber-500 bg-amber-50"
  if (dias <= 7) return "border-l-orange-400 bg-orange-50"
  return "border-l-slate-200 bg-white"
}

function urgencyLabel(dias: number) {
  if (dias === 0) return <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">¡Hoy!</span>
  if (dias === 1) return <span className="text-xs font-semibold text-orange-600">Mañana</span>
  if (dias <= 7) return <span className="text-xs font-semibold text-orange-500">en {dias} días</span>
  return <span className="text-xs text-slate-500">en {dias} días</span>
}

export default function CumpleanosPage() {
  const [dias, setDias] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ["cumpleanos", dias],
    queryFn: () => alumnosApi.cumpleanos(dias).then(r => r.data),
  })
  const cumples: Cumpleanos[] = Array.isArray(data) ? data : []

  const hoy = cumples.filter(c => c.dias_para_cumpleanos === 0)
  const proximos = cumples.filter(c => c.dias_para_cumpleanos > 0)

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Cumpleaños</h1>
          <p className="text-sm text-slate-500 mt-1">
            {cumples.length} cumpleaños en los próximos {dias} días
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Ventana:</label>
          <select value={dias} onChange={e => setDias(+e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {WINDOW_OPTS.map(d => <option key={d} value={d}>{d} días</option>)}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !cumples.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🎂</span>
          <p className="text-sm">Sin cumpleaños en los próximos {dias} días.</p>
        </div>
      )}

      {/* Today */}
      {hoy.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Hoy</p>
          <div className="space-y-2">
            {hoy.map((c) => (
              <BirthdayCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {proximos.length > 0 && (
        <div>
          {hoy.length > 0 && (
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Próximos</p>
          )}
          <div className="space-y-2">
            {proximos.map((c) => (
              <BirthdayCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BirthdayCard({ c }: { c: Cumpleanos }) {
  const fnac = c.fecha_nacimiento ? new Date(c.fecha_nacimiento) : null
  const formatted = fnac
    ? fnac.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    : ""

  const age = fnac
    ? new Date().getFullYear() - fnac.getFullYear() + (c.dias_para_cumpleanos === 0 ? 0 : 1)
    : null

  return (
    <div className={`rounded-xl border-l-4 shadow-sm p-4 flex items-center gap-4 ${urgencyClass(c.dias_para_cumpleanos)}`}>
      <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
        🎂
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800">{c.nombre}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatted}
          {age !== null && <span className="ml-1">· cumple {age} años</span>}
        </p>
      </div>
      <div className="flex-shrink-0">
        {urgencyLabel(c.dias_para_cumpleanos)}
      </div>
    </div>
  )
}
