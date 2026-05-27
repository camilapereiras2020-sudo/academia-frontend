import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { asistenciaApi } from "../api"
import { gruposApi } from "@/features/grupos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import type { Grupo, Alumno, Sesion } from "@/types"

const ESTADO_LABELS: Record<string, string> = { present: "✓ Presente", absent: "✗ Ausente", makeup: "↻ Recuperacion", guest: "★ Invitado" }
const ESTADO_COLORS: Record<string, string> = { present: "bg-green-100 text-green-800", absent: "bg-red-100 text-red-800", makeup: "bg-blue-100 text-blue-800", guest: "bg-purple-100 text-purple-800" }

export default function AsistenciaPage() {
  const qc = useQueryClient()
  const [grupoId, setGrupoId] = useState<number | "">("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [showForm, setShowForm] = useState(false)
  const [registros, setRegistros] = useState<{ alumno: number; estado: string; nota: string }[]>([])

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results || []

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const allAlumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results || []

  const mes = fecha.slice(0, 7)
  const { data: sesionesRaw } = useQuery({
    queryKey: ["sesiones", grupoId, mes],
    queryFn: () => asistenciaApi.list({ grupo: grupoId as number, mes }).then(r => r.data),
    enabled: !!grupoId,
  })
  const sesiones: Sesion[] = Array.isArray(sesionesRaw) ? sesionesRaw : (sesionesRaw as any)?.results || []

  const grupoAlumnos = allAlumnos.filter(a => (a.grupos_detalle ?? []).some(g => g.grupo === grupoId))

  function startNewSession() {
    setRegistros(grupoAlumnos.map(a => ({ alumno: a.id, estado: "present", nota: "" })))
    setShowForm(true)
  }

  const saveMut = useMutation({
    mutationFn: () => asistenciaApi.create({
      grupo: grupoId as number,
      fecha,
      registros: registros.map(r => ({ alumno: r.alumno, estado: r.estado, nota: r.nota })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones"] })
      setShowForm(false)
    },
  })

  function toggleEstado(idx: number) {
    const order = ["present", "absent", "makeup", "guest"]
    setRegistros(prev => {
      const n = [...prev]
      const cur = order.indexOf(n[idx].estado)
      n[idx] = { ...n[idx], estado: order[(cur + 1) % order.length] }
      return n
    })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Asistencia</h1>

      <div className="flex gap-3 mb-6 flex-wrap items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Grupo</label>
          <select value={grupoId} onChange={e => { setGrupoId(+e.target.value); setShowForm(false) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar grupo...</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {grupoId && !showForm && (
          <button onClick={startNewSession} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Pasar lista
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Pasar lista — {fecha}</h2>
          {!grupoAlumnos.length && <p className="text-slate-400 text-sm">No hay alumnos en este grupo.</p>}
          <div className="space-y-2">
            {registros.map((r, idx) => {
              const alumno = allAlumnos.find(a => a.id === r.alumno)
              return (
                <div key={r.alumno} className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-sm w-48">{alumno?.nombre}</span>
                  <button onClick={() => toggleEstado(idx)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full min-w-[120px] text-center ${ESTADO_COLORS[r.estado]}`}>
                    {ESTADO_LABELS[r.estado]}
                  </button>
                  <input type="text" placeholder="Nota..." value={r.nota}
                    onChange={e => { const n = [...registros]; n[idx] = { ...n[idx], nota: e.target.value }; setRegistros(n) }}
                    className="border rounded px-2 py-1 text-xs flex-1 min-w-[150px]" />
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm">Cancelar</button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {saveMut.isPending ? "Guardando..." : "Guardar asistencia"}
            </button>
          </div>
        </div>
      )}

      {grupoId && !showForm && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-slate-800">Historial — {grupos.find(g => g.id === grupoId)?.nombre}</h2>
          </div>
          {!sesiones.length && <p className="p-6 text-slate-400 text-sm">Sin sesiones este mes.</p>}
          {sesiones.map(s => (
            <div key={s.id} className="border-b last:border-b-0 px-6 py-3">
              <p className="text-sm font-semibold text-slate-700">{s.fecha} {s.hora && `— ${s.hora}`}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {(s.registros ?? []).map(r => (
                  <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[r.estado]}`}>
                    {r.alumno_nombre}: {ESTADO_LABELS[r.estado]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!grupoId && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">📋</span><p className="text-sm">Selecciona un grupo para ver o registrar asistencia.</p>
        </div>
      )}
    </div>
  )
}
