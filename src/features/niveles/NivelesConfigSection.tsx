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
    <div className="card !bg-white p-6 space-y-6 mt-6">
      <div>
        <p className="font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700">Niveles</p>
        <p className="text-[14px] text-ink-soft mt-1">
          Los niveles disponibles en los desplegables de Grupos y Alumnos, agrupados por Kids / Teens / Adults.
        </p>
      </div>

      {error && <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px]">{error}</p>}

      {isLoading ? (
        <p className="text-[15px] text-ink-soft">Cargando…</p>
      ) : (
        CATEGORIAS.map(({ value: categoria, label }) => {
          const items = niveles.filter(n => n.categoria === categoria).sort((a, b) => a.orden - b.orden)
          return (
            <div key={categoria}>
              <p className="font-label text-[14px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-2">{label}</p>
              <div className="space-y-1">
                {items.map((n, idx) => (
                  <div key={n.id}
                    className={`flex items-center gap-2 min-h-[52px] px-3 py-1.5 rounded-[10px] border border-pine-900/15 text-[15px] ${n.activo ? "bg-white" : "bg-khaki-100 opacity-60"}`}>
                    <div className="flex flex-col leading-none">
                      <button type="button" disabled={idx === 0} onClick={() => move(categoria, idx, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-[8px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 disabled:opacity-30 text-[13px]" aria-label="Subir">▲</button>
                      <button type="button" disabled={idx === items.length - 1} onClick={() => move(categoria, idx, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-[8px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 disabled:opacity-30 text-[13px]" aria-label="Bajar">▼</button>
                    </div>
                    {editingId === n.id ? (
                      <input autoFocus className="input flex-1 !min-h-[40px]"
                        value={editingNombre}
                        onChange={e => setEditingNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditingId(null) }}
                        onBlur={saveEditing} />
                    ) : (
                      <span className="flex-1">{n.nombre}</span>
                    )}
                    {!n.activo && <span className="text-[14px] text-ink-soft">(inactivo)</span>}
                    {editingId !== n.id && (
                      <button type="button" className="min-h-[40px] px-2 rounded-[8px] font-label text-[14px] font-semibold text-pine-700 hover:bg-khaki-100 hover:text-pine-900"
                        onClick={() => startEditing(n)}>Renombrar</button>
                    )}
                    <button type="button" className="min-h-[40px] px-2 rounded-[8px] font-label text-[14px] font-semibold text-pine-700 hover:bg-red-50 hover:text-red-700"
                      onClick={() => toggleActivo(n)}>
                      {n.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ))}
                {!items.length && <p className="text-[14px] text-ink-soft">Sin niveles.</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder={`Nuevo nivel ${label}…`}
                  value={nuevoNombre[categoria]}
                  onChange={e => setNuevoNombre(f => ({ ...f, [categoria]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") addNivel(categoria) }}
                  className="input flex-1" />
                <button type="button" onClick={() => addNivel(categoria)}
                  disabled={!nuevoNombre[categoria].trim() || createMut.isPending}
                  className="btn-primary disabled:opacity-50">
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
