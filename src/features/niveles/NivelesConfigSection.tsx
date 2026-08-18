import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { nivelesApi } from "./api"
import type { CategoriaNivel, Nivel } from "@/types"

const CATEGORIAS: { value: CategoriaNivel; label: string }[] = [
  { value: "kids", label: "Kids" },
  { value: "teens", label: "Teens" },
  { value: "adults", label: "Adults" },
]

export default function NivelesConfigSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["niveles", "all"], queryFn: () => nivelesApi.list() })
  const niveles = data?.data ?? []

  const [nuevoNombre, setNuevoNombre] = useState<Record<CategoriaNivel, string>>({ kids: "", teens: "", adults: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNombre, setEditingNombre] = useState("")
  const [error, setError] = useState("")

  const invalidate = () => qc.invalidateQueries({ queryKey: ["niveles"] })

  const createMut = useMutation({
    mutationFn: (vars: { categoria: CategoriaNivel; nombre: string; orden: number }) => nivelesApi.create(vars),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.nombre?.[0] ?? "Error al crear el nivel."),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Nivel> }) => nivelesApi.update(id, data),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.nombre?.[0] ?? "Error al guardar el nivel."),
  })

  function addNivel(categoria: CategoriaNivel) {
    const nombre = nuevoNombre[categoria].trim()
    if (!nombre) return
    setError("")
    const itemsCat = niveles.filter(n => n.categoria === categoria)
    const maxOrden = itemsCat.length ? Math.max(...itemsCat.map(n => n.orden)) : -1
    createMut.mutate({ categoria, nombre, orden: maxOrden + 1 })
    setNuevoNombre(f => ({ ...f, [categoria]: "" }))
  }

  function startEditing(n: Nivel) {
    setError("")
    setEditingId(n.id)
    setEditingNombre(n.nombre)
  }
  function saveEditing() {
    if (editingId == null) return
    const nombre = editingNombre.trim()
    if (!nombre) { setEditingId(null); return }
    setError("")
    updateMut.mutate({ id: editingId, data: { nombre } })
    setEditingId(null)
  }

  function toggleActivo(n: Nivel) {
    setError("")
    updateMut.mutate({ id: n.id, data: { activo: !n.activo } })
  }

  function move(categoria: CategoriaNivel, index: number, direction: -1 | 1) {
    const itemsCat = niveles.filter(n => n.categoria === categoria).sort((a, b) => a.orden - b.orden)
    const target = index + direction
    if (target < 0 || target >= itemsCat.length) return
    setError("")
    const a = itemsCat[index]
    const b = itemsCat[target]
    updateMut.mutate({ id: a.id, data: { orden: b.orden } })
    updateMut.mutate({ id: b.id, data: { orden: a.orden } })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6 mt-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Niveles</p>
        <p className="text-xs text-slate-500 mt-1">
          Los niveles disponibles en los desplegables de Grupos y Alumnos, agrupados por Kids / Teens / Adults.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        CATEGORIAS.map(({ value: categoria, label }) => {
          const items = niveles.filter(n => n.categoria === categoria).sort((a, b) => a.orden - b.orden)
          return (
            <div key={categoria}>
              <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
              <div className="space-y-1">
                {items.map((n, idx) => (
                  <div key={n.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${n.activo ? "bg-white" : "bg-slate-50 opacity-60"}`}>
                    <div className="flex flex-col leading-none">
                      <button type="button" disabled={idx === 0} onClick={() => move(categoria, idx, -1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs" aria-label="Subir">▲</button>
                      <button type="button" disabled={idx === items.length - 1} onClick={() => move(categoria, idx, 1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs" aria-label="Bajar">▼</button>
                    </div>
                    {editingId === n.id ? (
                      <input autoFocus className="flex-1 border rounded px-2 py-1 text-sm"
                        value={editingNombre}
                        onChange={e => setEditingNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditingId(null) }}
                        onBlur={saveEditing} />
                    ) : (
                      <span className="flex-1">{n.nombre}</span>
                    )}
                    {!n.activo && <span className="text-xs text-slate-400">(inactivo)</span>}
                    {editingId !== n.id && (
                      <button type="button" className="text-xs text-slate-500 hover:text-slate-800"
                        onClick={() => startEditing(n)}>Renombrar</button>
                    )}
                    <button type="button" className="text-xs text-slate-500 hover:text-red-600"
                      onClick={() => toggleActivo(n)}>
                      {n.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ))}
                {!items.length && <p className="text-xs text-slate-400">Sin niveles.</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder={`Nuevo nivel ${label}…`}
                  value={nuevoNombre[categoria]}
                  onChange={e => setNuevoNombre(f => ({ ...f, [categoria]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") addNivel(categoria) }}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => addNivel(categoria)}
                  disabled={!nuevoNombre[categoria].trim() || createMut.isPending}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50">
                  Añadir
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
