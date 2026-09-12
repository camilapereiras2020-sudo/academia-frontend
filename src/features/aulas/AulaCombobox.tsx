import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { aulasApi } from "./api"
import type { Aula } from "@/types"

interface Props {
  /** Aula.nombre — Grupo.aula stays a free-text string, so this combobox
   * works off the name, not an id, same as the plain <input> it replaces. */
  value: string
  onChange: (nombre: string) => void
  className?: string
}

// Type an existing room name to pick it up (código shown alongside), or a new
// one to auto-create it with the next código (A1, A2…) — mirrors
// PagadorCombobox's search-or-create pattern, one field simpler since aulas
// have no other data besides nombre/código.
export default function AulaCombobox({ value, onChange, className }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data } = useQuery({ queryKey: ["aulas"], queryFn: () => aulasApi.list().then(r => r.data) })
  const aulas: Aula[] = Array.isArray(data) ? data : []
  const selected = aulas.find(a => a.nombre === value) ?? null

  const createMut = useMutation({
    mutationFn: (nombre: string) => aulasApi.create({ nombre }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["aulas"] })
      onChange(res.data.nombre)
      setOpen(false)
    },
  })

  const q = value.trim().toLowerCase()
  const matches = q ? aulas.filter(a => a.nombre.toLowerCase().includes(q)) : aulas
  const exactMatch = aulas.some(a => a.nombre.toLowerCase() === q)

  return (
    <div className="relative">
      <input type="text" value={value} placeholder="Aula 1, Online…"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={className} />
      {selected?.codigo && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-khaki-400">
          {selected.codigo}
        </span>
      )}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {matches.map(a => (
            <button key={a.id} type="button" onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(a.nombre); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-khaki-100 text-pine-700 flex justify-between">
              <span>{a.nombre}</span>
              <span className="text-khaki-400 text-xs">{a.codigo}</span>
            </button>
          ))}
          {!matches.length && (
            <p className="px-3 py-2 text-xs text-pine-600">Sin aulas registradas.</p>
          )}
          {q && !exactMatch && (
            <button type="button" onMouseDown={e => e.preventDefault()} disabled={createMut.isPending}
              onClick={() => createMut.mutate(value.trim())}
              className="w-full text-left px-3 py-1.5 text-sm text-brass-700 hover:bg-khaki-100 border-t disabled:opacity-50">
              {createMut.isPending ? "Creando…" : `+ Crear aula "${value.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
