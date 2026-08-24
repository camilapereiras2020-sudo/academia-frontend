import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { profesoresApi } from "./api"
import type { Profesor } from "@/types"

export default function ProfesoresConfigSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["profesores", "all"], queryFn: () => profesoresApi.list() })
  const profesores = (data?.data ?? []).slice().sort((a, b) => a.orden - b.orden)

  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoSuplente, setNuevoSuplente] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNombre, setEditingNombre] = useState("")
  const [error, setError] = useState("")

  const invalidate = () => qc.invalidateQueries({ queryKey: ["profesores"] })

  const createMut = useMutation({
    mutationFn: (vars: { nombre: string; es_suplente: boolean; orden: number }) => profesoresApi.create(vars),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.nombre?.[0] ?? "Error al crear el profesor/a."),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Profesor> }) => profesoresApi.update(id, data),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.nombre?.[0] ?? "Error al guardar el profesor/a."),
  })

  function addProfesor() {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    setError("")
    const maxOrden = profesores.length ? Math.max(...profesores.map(p => p.orden)) : -1
    createMut.mutate({ nombre, es_suplente: nuevoSuplente, orden: maxOrden + 1 })
    setNuevoNombre("")
    setNuevoSuplente(false)
  }

  function startEditing(p: Profesor) {
    setError("")
    setEditingId(p.id)
    setEditingNombre(p.nombre)
  }
  function saveEditing() {
    if (editingId == null) return
    const nombre = editingNombre.trim()
    if (!nombre) { setEditingId(null); return }
    setError("")
    updateMut.mutate({ id: editingId, data: { nombre } })
    setEditingId(null)
  }

  function toggleActivo(p: Profesor) {
    setError("")
    updateMut.mutate({ id: p.id, data: { activo: !p.activo } })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= profesores.length) return
    setError("")
    const a = profesores[index]
    const b = profesores[target]
    updateMut.mutate({ id: a.id, data: { orden: b.orden } })
    updateMut.mutate({ id: b.id, data: { orden: a.orden } })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4 mt-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-pine-600">Profesores</p>
        <p className="text-xs text-pine-600 mt-1">
          El listado de profesores disponible en Grupos, Horario y Calendario.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-pine-600">Cargando…</p>
      ) : (
        <div className="space-y-1">
          {profesores.map((p, idx) => (
            <div key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${p.activo ? "bg-white" : "bg-khaki-100 opacity-60"}`}>
              <div className="flex flex-col leading-none">
                <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)}
                  className="text-khaki-400 hover:text-pine-700 disabled:opacity-30 text-xs" aria-label="Subir">▲</button>
                <button type="button" disabled={idx === profesores.length - 1} onClick={() => move(idx, 1)}
                  className="text-khaki-400 hover:text-pine-700 disabled:opacity-30 text-xs" aria-label="Bajar">▼</button>
              </div>
              {editingId === p.id ? (
                <input autoFocus className="flex-1 border rounded px-2 py-1 text-sm"
                  value={editingNombre}
                  onChange={e => setEditingNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditingId(null) }}
                  onBlur={saveEditing} />
              ) : (
                <span className="flex-1">{p.nombre}</span>
              )}
              {p.es_suplente && <span className="text-xs text-pine-600">(suplente)</span>}
              {!p.activo && <span className="text-xs text-khaki-400">(inactivo)</span>}
              {editingId !== p.id && (
                <button type="button" className="text-xs text-pine-600 hover:text-pine-900"
                  onClick={() => startEditing(p)}>Renombrar</button>
              )}
              <button type="button" className="text-xs text-pine-600 hover:text-red-600"
                onClick={() => toggleActivo(p)}>
                {p.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
          {!profesores.length && <p className="text-xs text-khaki-400">Sin profesores.</p>}
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <input type="text" placeholder="Nuevo profesor/a…"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addProfesor() }}
          className="flex-1 min-w-[160px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
        <label className="flex items-center gap-1.5 text-xs text-pine-700">
          <input type="checkbox" checked={nuevoSuplente} onChange={e => setNuevoSuplente(e.target.checked)} />
          Suplente
        </label>
        <button type="button" onClick={addProfesor}
          disabled={!nuevoNombre.trim() || createMut.isPending}
          className="px-3 py-1.5 rounded-lg bg-brass-500 text-white text-xs hover:bg-brass-700 disabled:opacity-50">
          Añadir
        </button>
      </div>
    </div>
  )
}
