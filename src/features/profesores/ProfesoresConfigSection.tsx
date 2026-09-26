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
    <div className="card !bg-white p-6 space-y-4 mt-6">
      <div>
        <p className="font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700">Profesores</p>
        <p className="text-[14px] text-ink-soft mt-1">
          El listado de profesores disponible en Grupos, Horario y Calendario.
        </p>
      </div>

      {error && <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px]">{error}</p>}

      {isLoading ? (
        <p className="text-[15px] text-ink-soft">Cargando…</p>
      ) : (
        <div className="space-y-1">
          {profesores.map((p, idx) => (
            <div key={p.id}
              className={`flex items-center gap-2 min-h-[52px] px-3 py-1.5 rounded-[10px] border border-pine-900/15 text-[15px] ${p.activo ? "bg-white" : "bg-khaki-100 opacity-60"}`}>
              <div className="flex flex-col leading-none">
                <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)}
                  className="w-9 h-9 flex items-center justify-center rounded-[8px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 disabled:opacity-30 text-[13px]" aria-label="Subir">▲</button>
                <button type="button" disabled={idx === profesores.length - 1} onClick={() => move(idx, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-[8px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 disabled:opacity-30 text-[13px]" aria-label="Bajar">▼</button>
              </div>
              {editingId === p.id ? (
                <input autoFocus className="input flex-1 !min-h-[40px]"
                  value={editingNombre}
                  onChange={e => setEditingNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditingId(null) }}
                  onBlur={saveEditing} />
              ) : (
                <span className="flex-1">{p.nombre}</span>
              )}
              {p.es_suplente && <span className="text-[14px] text-ink-soft">(suplente)</span>}
              {!p.activo && <span className="text-[14px] text-ink-soft">(inactivo)</span>}
              {editingId !== p.id && (
                <button type="button" className="min-h-[40px] px-2 rounded-[8px] font-label text-[14px] font-semibold text-pine-700 hover:bg-khaki-100 hover:text-pine-900"
                  onClick={() => startEditing(p)}>Renombrar</button>
              )}
              <button type="button" className="min-h-[40px] px-2 rounded-[8px] font-label text-[14px] font-semibold text-pine-700 hover:bg-red-50 hover:text-red-700"
                onClick={() => toggleActivo(p)}>
                {p.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
          {!profesores.length && <p className="text-[14px] text-ink-soft">Sin profesores.</p>}
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <input type="text" placeholder="Nuevo profesor/a…"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addProfesor() }}
          className="input flex-1 min-w-[160px]" />
        <label className="flex items-center gap-2 min-h-[44px] text-[15px] text-pine-900">
          <input type="checkbox" className="w-5 h-5 accent-pine-900" checked={nuevoSuplente} onChange={e => setNuevoSuplente(e.target.checked)} />
          Suplente
        </label>
        <button type="button" onClick={addProfesor}
          disabled={!nuevoNombre.trim() || createMut.isPending}
          className="btn-primary disabled:opacity-50">
          Añadir
        </button>
      </div>
    </div>
  )
}
