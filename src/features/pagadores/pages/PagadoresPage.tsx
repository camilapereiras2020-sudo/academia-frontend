import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { pagadoresApi } from "../api"

export default function PagadoresPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const { data: pagadores, isLoading } = useQuery({
    queryKey: ["pagadores"],
    queryFn: () => pagadoresApi.list().then((r) => r.data),
  })

  const visibles = (pagadores ?? []).filter((p) =>
    !search.trim() || p.nombre.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-head font-normal text-3xl text-pine-900">Payers</h1>
          <p className="text-sm text-pine-700 mt-1">{pagadores?.length ?? 0} pagadores registrados</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-khaki-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pagador..."
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 bg-white"
        />
      </div>

      {isLoading && <p className="text-khaki-400 text-sm">Cargando...</p>}

      {!isLoading && !visibles.length && (
        <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
          <span className="text-5xl mb-3">👛</span>
          <p className="text-sm">Sin pagadores.</p>
        </div>
      )}

      <div className="space-y-2">
        {visibles.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/payers/${p.id}`)}
            className="bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:border-brass-300 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-pine-900">{p.nombre}</p>
              <p className="text-xs text-pine-700 mt-0.5">
                {p.alumnos_count} hijo{p.alumnos_count !== 1 ? "s" : ""}
                {p.email && ` · ${p.email}`}
                {p.telefono && ` · ${p.telefono}`}
              </p>
            </div>
            {p.alumnos_count > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-khaki-200 text-brass-700">
                Familia
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
