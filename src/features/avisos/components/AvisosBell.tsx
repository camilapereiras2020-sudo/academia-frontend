import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { avisosApi } from "../api"
import { useAuthStore } from "@/store/authStore"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"
import { nombreUsuario } from "@/lib/nombres"

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

export default function AvisosBell() {
  const qc = useQueryClient()
  const myId = useAuthStore((s) => s.user?.id)
  const [open, setOpen] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [para, setPara] = useState<number | "todos" | "">("")
  const [fecha, setFecha] = useState("")
  const panelOverlayGuard = useOverlayMouseGuard(() => setOpen(false))
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: pendientesRaw } = useQuery({
    queryKey: ["avisos", "para-mi"],
    queryFn: () => avisosApi.list({ para_mi: true }).then((r) => r.data),
    refetchInterval: 60_000,
  })
  const pendientes = pendientesRaw ?? []

  const { data: equipoRaw } = useQuery({
    queryKey: ["avisos", "equipo"],
    queryFn: () => avisosApi.equipo().then((r) => r.data),
    enabled: open,
  })
  const equipo = (equipoRaw ?? []).filter((u) => u.id !== myId)

  const marcarLeidoMut = useMutation({
    mutationFn: (id: number) => avisosApi.update(id, { hecha: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos"] }),
  })

  const enviarMut = useMutation({
    // "Todo el equipo" = una copia por compañera, cada una la marca como leída.
    mutationFn: async () => {
      const destinos = para === "todos" ? equipo.map((u) => u.id) : [para as number]
      for (const id of destinos) {
        await avisosApi.create({ titulo: titulo.trim(), para: id, fecha: fecha || null })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avisos"] })
      setTitulo(""); setPara(""); setFecha(""); setShowCompose(false)
    },
  })

  function toggle() {
    setOpen((o) => !o)
    setShowCompose(false)
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={toggle}
        aria-label="Avisos"
        className="relative w-11 h-11 flex items-center justify-center rounded-[10px] border border-khaki-100/30 text-khaki-100 hover:bg-white/10 xl:border-pine-900/25 xl:text-pine-900 xl:hover:bg-pine-900/5"
      >
        <Bell size={17} strokeWidth={2} />
        {pendientes.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-brass-500 text-white text-xs font-bold flex items-center justify-center">
            {pendientes.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside-to-close layer — transparent, sits under the panel */}
          <div className="fixed inset-0 z-40" {...panelOverlayGuard} />
          <div
            ref={panelRef}
            className="fixed inset-x-3 top-[68px] xl:absolute xl:inset-x-auto xl:right-0 xl:top-[calc(100%+8px)] z-50 xl:w-[26rem] bg-white rounded-xl border shadow-xl max-h-[70vh] flex flex-col"
          >
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <p className="text-base font-semibold text-pine-900">Avisos</p>
              <button
                onClick={() => setShowCompose((s) => !s)}
                className="text-sm font-semibold text-brass-700 hover:text-brass-900"
              >
                {showCompose ? "Cancelar" : "+ Nuevo"}
              </button>
            </div>

            {showCompose && (
              <div className="p-4 border-b flex flex-col gap-2 flex-shrink-0">
                <input
                  autoFocus
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="¿Qué querés avisar?"
                  className="w-full bg-white text-black placeholder:text-pine-600 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brass-500"
                />
                <div className="flex gap-2">
                  <select
                    value={para}
                    onChange={(e) => setPara(e.target.value === "todos" ? "todos" : e.target.value ? Number(e.target.value) : "")}
                    className="flex-1 bg-white text-black border rounded-lg px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brass-500"
                  >
                    <option value="">Para quién...</option>
                    {equipo.length > 1 && <option value="todos">Todo el equipo</option>}
                    {equipo.map((u) => (
                      <option key={u.id} value={u.id}>{nombreUsuario(u.username)}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    title="Fecha (opcional, aparece en el calendario)"
                    className="bg-white text-black border rounded-lg px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brass-500"
                  />
                </div>
                <button
                  onClick={() => enviarMut.mutate()}
                  disabled={!titulo.trim() || !para || enviarMut.isPending}
                  className="self-end px-3 py-1.5 rounded-lg bg-brass-500 text-white text-sm font-semibold hover:bg-brass-700 disabled:opacity-50"
                >
                  {enviarMut.isPending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            )}

            <div className="overflow-y-auto">
              {!pendientes.length && !showCompose && (
                <p className="text-base text-pine-600 p-4">Sin avisos pendientes.</p>
              )}
              {pendientes.map((a) => (
                <div key={a.id} className="px-4 py-3 border-b last:border-b-0 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base text-pine-900">{a.titulo}</p>
                    <p className="text-sm text-pine-600 mt-0.5">
                      De {nombreUsuario(a.creado_por_nombre)}{a.fecha ? ` · ${formatFecha(a.fecha)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => marcarLeidoMut.mutate(a.id)}
                    disabled={marcarLeidoMut.isPending}
                    className="text-sm font-semibold text-pine-700 hover:text-brass-700 flex-shrink-0"
                  >
                    Listo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
