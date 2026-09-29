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
          <h1 className="page-title">Pagadores</h1>
          <p className="page-subtitle">{pagadores?.length ?? 0} pagadores registrados</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pagador..."
          className="input !pl-10"
        />
      </div>

      {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}

      {!isLoading && !visibles.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <span className="text-5xl mb-3">👛</span>
          <p className="text-[15px]">Sin pagadores.</p>
        </div>
      )}

      <div className="space-y-2">
        {visibles.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/payers/${p.id}`)}
            className="card !bg-white p-4 cursor-pointer hover:!border-brass-500 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-[16px] font-semibold text-ink">{p.nombre}</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                {p.es_alumno_adulto
                  ? "Alumno adulto"
                  : `${p.alumnos_count} alumno${p.alumnos_count !== 1 ? "s" : ""}`}
                {p.email && ` · ${p.email}`}
                {p.telefono && ` · ${p.telefono}`}
              </p>
            </div>
            {!p.es_alumno_adulto && p.alumnos_count > 1 && (
              <span className="badge bg-khaki-200 text-brass-700 normal-case tracking-normal">
                Familia
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
