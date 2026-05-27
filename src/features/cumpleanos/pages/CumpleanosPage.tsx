import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { alumnosApi } from "@/features/alumnos/alumnos_api"

export default function CumpleanosPage() {
  const [dias, setDias] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ["cumpleanos", dias],
    queryFn: () => alumnosApi.cumpleanos(dias).then(r => r.data),
  })

  const cumples = Array.isArray(data) ? data : []

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Cumpleanos</h1>
          <p className="text-sm text-slate-500 mt-1">Proximos {dias} dias</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Dias:</label>
          <select value={dias} onChange={e => setDias(+e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} dias</option>)}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {!isLoading && !cumples.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🎂</span><p className="text-sm">No hay cumpleanos proximos.</p>
        </div>
      )}

      <div className="space-y-3">
        {cumples.map((c: any) => (
          <div key={c.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">🎂</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{c.nombre}</p>
              <p className="text-xs text-slate-500">{c.fnac}</p>
            </div>
            <div className="text-right">
              {c.dias === 0
                ? <span className="text-sm font-bold text-amber-600">Hoy!</span>
                : <span className="text-sm font-semibold text-slate-600">en {c.dias} {c.dias === 1 ? "dia" : "dias"}</span>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
