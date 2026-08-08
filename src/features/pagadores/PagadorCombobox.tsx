import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagadoresApi } from "./api"
import type { Pagador } from "@/types"

interface Props {
  value: number | null
  onChange: (pagadorId: number | null) => void
  /** "tailwind" matches AlumnosPage's raw-Tailwind modal (default). "gold" matches the
   * .card/.input gold-dark system used by AlumnoDetailPage/DashboardPage. */
  theme?: "tailwind" | "gold"
}

export default function PagadorCombobox({ value, onChange, theme = "tailwind" }: Props) {
  const gold = theme === "gold"
  const qc = useQueryClient()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const { data } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const pagadores: Pagador[] = Array.isArray(data) ? data : []
  const selected = pagadores.find(p => p.id === value) ?? null
  const displayValue = open ? query : (selected?.nombre ?? "")

  const createMut = useMutation({
    mutationFn: (nombre: string) => pagadoresApi.create({ nombre }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["pagadores"] })
      onChange(res.data.id)
      setQuery(res.data.nombre)
      setOpen(false)
    },
  })

  const q = query.trim().toLowerCase()
  const matches = q ? pagadores.filter(p => p.nombre.toLowerCase().includes(q)) : pagadores
  const exactMatch = pagadores.some(p => p.nombre.toLowerCase() === q)

  function selectPagador(p: Pagador) {
    onChange(p.id)
    setQuery(p.nombre)
    setOpen(false)
  }

  function clearSelection() {
    onChange(null)
    setQuery("")
    setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(selected?.nombre ?? ""); setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar o crear pagador..."
          className={gold ? "input" : "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"}
        />
        {selected && (
          <button type="button" onClick={clearSelection}
            className={gold ? "btn-ghost" : "text-pine-600 hover:text-pine-600 text-sm flex-shrink-0"}
            style={gold ? { padding: "0.25rem 0.5rem", flexShrink: 0 } : undefined}>
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className={gold ? "card" : "absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto"}
          style={gold ? { position: "absolute", zIndex: 10, marginTop: "0.25rem", width: "100%", maxHeight: "14rem", overflowY: "auto" } : undefined}
        >
          {matches.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => selectPagador(p)}
              className={gold ? "combobox-option" : "w-full text-left px-3 py-2 text-sm hover:bg-khaki-100 text-pine-700"}
            >
              {p.nombre}{p.metodo ? ` · ${p.metodo}` : ""}
            </button>
          ))}
          {!matches.length && (
            <p className={gold ? undefined : "px-3 py-2 text-xs text-pine-600"}
              style={gold ? { padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text-dim)" } : undefined}>
              Sin pagadores registrados.
            </p>
          )}
          {q && !exactMatch && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              disabled={createMut.isPending}
              onClick={() => createMut.mutate(query.trim())}
              className={gold ? "combobox-option" : "w-full text-left px-3 py-2 text-sm text-brass-700 hover:bg-khaki-100 border-t disabled:opacity-50"}
              style={gold ? { color: "var(--gold)", borderTop: "1px solid var(--border-subtle)", opacity: createMut.isPending ? 0.5 : 1 } : undefined}
            >
              {createMut.isPending ? "Creando..." : `+ Crear pagador "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
