import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, RotateCcw, Send } from "lucide-react"
import { avisosApi } from "../api"
import { useAuthStore } from "@/store/authStore"
import { nombreUsuario } from "@/lib/nombres"
import type { Aviso } from "@/types"

// "Memo page" del equipo: cada aviso es una conversación donde se puede
// contestar. Una lista a la izquierda (pendientes / resueltos) y el hilo a la
// derecha; en móvil se ve una cosa u otra. "Resolver" cierra el hilo para
// todas; si alguien contesta, se reabre solo.

function cuando(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function destinatario(a: Aviso) {
  return a.para_todos ? "Todo el equipo" : nombreUsuario(a.para_nombre) || "—"
}

export default function AvisosPage() {
  const qc = useQueryClient()
  const myId = useAuthStore((s) => s.user?.id)
  const [params, setParams] = useSearchParams()
  const selId = Number(params.get("aviso")) || null
  const [tab, setTab] = useState<"pendientes" | "resueltos">("pendientes")
  const [showNuevo, setShowNuevo] = useState(false)

  const { data: raw, isLoading } = useQuery({
    queryKey: ["avisos", "hilos"],
    queryFn: () => avisosApi.list().then((r) => r.data),
    refetchInterval: 20_000,
  })

  // Conversaciones: las notas (sin fecha) y las tareas con fecha en las que
  // participo. Las tareas de calendario de otras personas no son hilos míos.
  const hilos = useMemo(
    () =>
      (raw ?? [])
        .filter((a) => a.fecha === null || a.creado_por === myId || a.para === myId || a.para_todos)
        .sort((x, y) => y.ultima_actividad.localeCompare(x.ultima_actividad)),
    [raw, myId],
  )
  const pendientes = hilos.filter((a) => !a.hecha)
  const resueltos = hilos.filter((a) => a.hecha)
  const sel = hilos.find((a) => a.id === selId) ?? null
  const lista = tab === "pendientes" ? pendientes : resueltos
  const sinLeer = pendientes.filter((a) => a.no_leido).length

  function abrir(id: number | null) {
    setParams(id ? { aviso: String(id) } : {}, { replace: false })
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Avisos</h1>
          <p className="page-subtitle">
            {sinLeer > 0 ? `${sinLeer} sin leer · ` : ""}{pendientes.length} abiertos
          </p>
        </div>
        <button onClick={() => setShowNuevo((s) => !s)} className="btn-primary inline-flex items-center gap-2">
          {showNuevo ? "Cancelar" : "+ Nuevo aviso"}
        </button>
      </div>

      {showNuevo && (
        <NuevoAviso
          onCreado={(a) => { setShowNuevo(false); setTab("pendientes"); abrir(a.id); qc.invalidateQueries({ queryKey: ["avisos"] }) }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
        {/* Lista de conversaciones */}
        <div className={`${sel ? "hidden lg:block" : ""}`}>
          <div className="flex gap-2 mb-3">
            {([
              ["pendientes", `Abiertos (${pendientes.length})`],
              ["resueltos", `Resueltos (${resueltos.length})`],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
                  tab === v ? "bg-pine-900 text-khaki-100 border-pine-900" : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="card !bg-white overflow-hidden">
            {isLoading && <p className="p-4 text-[15px] text-ink-soft">Cargando…</p>}
            {!isLoading && !lista.length && (
              <p className="p-4 text-[15px] text-ink-soft">
                {tab === "pendientes" ? "No hay avisos abiertos." : "Todavía no hay avisos resueltos."}
              </p>
            )}
            {lista.map((a) => (
              <button key={a.id} onClick={() => abrir(a.id)}
                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-khaki-100 flex gap-3 ${
                  a.id === selId ? "bg-khaki-100" : ""
                }`}>
                <span className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.no_leido && !a.hecha ? "bg-brass-500" : "bg-transparent"}`}
                  aria-label={a.no_leido && !a.hecha ? "Sin leer" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[16px] text-ink truncate ${a.no_leido && !a.hecha ? "font-bold" : "font-semibold"}`}>{a.titulo}</span>
                  <span className="block text-[14px] text-ink-soft truncate">
                    {nombreUsuario(a.creado_por_nombre)} → {destinatario(a)}
                    {a.mensajes_count > 0 && ` · 💬 ${a.mensajes_count}`}
                  </span>
                  {a.ultimo_texto && <span className="block text-[14px] text-ink truncate">{a.ultimo_texto}</span>}
                  <span className="block text-[13px] text-ink-soft">{cuando(a.ultima_actividad)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversación */}
        <div className={`${sel ? "" : "hidden lg:block"}`}>
          {sel
            ? <Conversacion key={sel.id} aviso={sel} myId={myId} onVolver={() => abrir(null)} />
            : (
              <div className="card !bg-white p-10 text-center text-[15px] text-ink-soft">
                Elige un aviso para ver la conversación, o crea uno nuevo.
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

function NuevoAviso({ onCreado }: { onCreado: (a: Aviso) => void }) {
  const myId = useAuthStore((s) => s.user?.id)
  const [titulo, setTitulo] = useState("")
  const [para, setPara] = useState<number | "todos" | "">("")
  const [fecha, setFecha] = useState("")
  const { data: equipoRaw } = useQuery({ queryKey: ["avisos", "equipo"], queryFn: () => avisosApi.equipo().then((r) => r.data) })
  const equipo = (equipoRaw ?? []).filter((u) => u.id !== myId)

  const crearMut = useMutation({
    mutationFn: () =>
      avisosApi.create(
        para === "todos"
          ? { titulo: titulo.trim(), para_todos: true, fecha: fecha || null }
          : { titulo: titulo.trim(), para: para as number, fecha: fecha || null },
      ).then((r) => r.data),
    onSuccess: onCreado,
  })

  return (
    <div className="card !bg-white p-4 mb-4 flex flex-col gap-3 max-w-2xl">
      <textarea
        autoFocus rows={2} value={titulo} onChange={(e) => setTitulo(e.target.value)}
        placeholder="¿Qué quieres avisar?"
        className="w-full border rounded-lg px-3 py-2 text-base bg-white text-black placeholder:text-pine-600 focus:outline-none focus:ring-2 focus:ring-brass-500"
      />
      <div className="flex flex-wrap gap-3">
        <select value={para} onChange={(e) => setPara(e.target.value === "todos" ? "todos" : e.target.value ? Number(e.target.value) : "")}
          className="flex-1 min-w-[180px] border rounded-lg px-2 py-2 text-base bg-white text-black focus:outline-none focus:ring-2 focus:ring-brass-500">
          <option value="">Para quién…</option>
          {equipo.length > 1 && <option value="todos">Todo el equipo</option>}
          {equipo.map((u) => <option key={u.id} value={u.id}>{nombreUsuario(u.username)}</option>)}
        </select>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          title="Fecha (opcional, aparece en el calendario)"
          className="border rounded-lg px-2 py-2 text-base bg-white text-black focus:outline-none focus:ring-2 focus:ring-brass-500" />
        <button onClick={() => crearMut.mutate()} disabled={!titulo.trim() || !para || crearMut.isPending}
          className="btn-primary disabled:opacity-50">
          {crearMut.isPending ? "Enviando…" : "Enviar"}
        </button>
      </div>
      {crearMut.isError && <p className="text-red-700 text-[14px]">No se pudo enviar el aviso.</p>}
    </div>
  )
}

function Conversacion({ aviso, myId, onVolver }: { aviso: Aviso; myId: number | undefined; onVolver: () => void }) {
  const qc = useQueryClient()
  const [texto, setTexto] = useState("")
  const fin = useRef<HTMLDivElement>(null)

  // Pedir el hilo lo marca como leído en el servidor; se refresca cada pocos
  // segundos para ver las respuestas nuevas mientras está abierto.
  const { data: mensajes, isLoading } = useQuery({
    queryKey: ["avisos", "mensajes", aviso.id],
    queryFn: () => avisosApi.mensajes(aviso.id).then((r) => r.data),
    refetchInterval: 8_000,
  })
  const total = mensajes?.length ?? 0

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["avisos", "hilos"] })
    qc.invalidateQueries({ queryKey: ["avisos", "para-mi"] })
    fin.current?.scrollIntoView({ block: "end" })
  }, [total, aviso.id, qc])

  const responderMut = useMutation({
    mutationFn: (t: string) => avisosApi.responder(aviso.id, t),
    onSuccess: () => {
      setTexto("")
      qc.invalidateQueries({ queryKey: ["avisos"] })
    },
  })
  const resolverMut = useMutation({
    mutationFn: (hecha: boolean) => avisosApi.update(aviso.id, { hecha }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos"] }),
  })

  function enviar() {
    const t = texto.trim()
    if (t && !responderMut.isPending) responderMut.mutate(t)
  }

  return (
    <div className="card !bg-white flex flex-col overflow-hidden lg:h-[calc(100vh-260px)] lg:min-h-[420px]">
      <div className="px-4 py-3 border-b flex items-start gap-3">
        <button onClick={onVolver} aria-label="Volver a la lista"
          className="lg:hidden w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-[10px] text-pine-900 hover:bg-khaki-100">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-ink break-words">{aviso.titulo}</p>
          <p className="text-[14px] text-ink-soft">
            {nombreUsuario(aviso.creado_por_nombre)} → {destinatario(aviso)}
            {aviso.fecha ? ` · para el ${new Date(aviso.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}` : ""}
            {" · "}{cuando(aviso.created_at)}
          </p>
        </div>
        {aviso.hecha ? (
          <button onClick={() => resolverMut.mutate(false)} disabled={resolverMut.isPending}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold border-pine-900/25 text-pine-900 hover:bg-khaki-100">
            <RotateCcw size={16} /> Reabrir
          </button>
        ) : (
          <button onClick={() => resolverMut.mutate(true)} disabled={resolverMut.isPending}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-[10px] bg-pine-900 text-khaki-100 text-[14px] font-semibold hover:bg-pine-700">
            <Check size={16} /> Resolver
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-khaki-100/40 min-h-[200px]">
        {isLoading && <p className="text-[15px] text-ink-soft">Cargando…</p>}
        {!isLoading && !total && (
          <p className="text-[15px] text-ink-soft text-center py-6">Aún no hay respuestas. Escribe la primera.</p>
        )}
        {mensajes?.map((m) => {
          const mio = m.autor === myId
          return (
            <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mio ? "bg-pine-900 text-khaki-100" : "bg-white border text-ink"}`}>
                {!mio && <p className="text-[13px] font-semibold text-brass-700 mb-0.5">{nombreUsuario(m.autor_nombre)}</p>}
                <p className="text-[16px] whitespace-pre-wrap break-words">{m.texto}</p>
                <p className={`text-[12px] mt-1 text-right ${mio ? "text-khaki-100/70" : "text-ink-soft"}`}>{cuando(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        {aviso.hecha && (
          <p className="text-center text-[14px] text-ink-soft">✓ Resuelto. Si alguien contesta, se reabre.</p>
        )}
        <div ref={fin} />
      </div>

      <div className="p-3 border-t flex items-end gap-2">
        <textarea
          rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Escribe una respuesta…  (Enter envía, Mayús+Enter salto de línea)"
          maxLength={2000}
          className="flex-1 border rounded-lg px-3 py-2 text-base bg-white text-black placeholder:text-pine-600 focus:outline-none focus:ring-2 focus:ring-brass-500 resize-none"
        />
        <button onClick={enviar} disabled={!texto.trim() || responderMut.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" aria-label="Enviar respuesta">
          <Send size={16} /> <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
      {responderMut.isError && <p className="px-4 pb-3 text-red-700 text-[14px]">No se pudo enviar la respuesta.</p>}
    </div>
  )
}
