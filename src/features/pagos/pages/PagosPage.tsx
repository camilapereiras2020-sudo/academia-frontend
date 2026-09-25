import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "../api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import { grupoLabel } from "@/features/grupos/palette"
import { formatEur, formatMonth, formatDate } from "@/lib/utils"
import type { Pago, Alumno, Pagador, Grupo, Marca } from "@/types"
import PagoDetailModal from "../PagoDetailModal"
import { useSetActiveBrand } from "@/store/useSetActiveBrand"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

const METODOS = ["efectivo", "bizum", "transferencia", "domiciliacion"] as const
const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo", bizum: "Bizum", transferencia: "Transferencia", domiciliacion: "Domiciliación",
}
const ESTADO_CLS: Record<string, string> = {
  pagado: "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial: "bg-amber-100 text-amber-800",
}
const ESTADO_LABEL: Record<string, string> = {
  pagado: "Pagado", pendiente: "Pendiente", parcial: "Parcial",
}

function Badge({ estado }: { estado: string }) {
  return (
    <span className={`badge ${ESTADO_CLS[estado] ?? "bg-khaki-100 text-pine-700"}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

const emptyForm = () => ({
  marca: "" as Marca | "",
  alumno: "" as number | "",
  pagador: "" as number | "",
  grupo: "" as number | "",
  mensualidad: "",
  metodo: "efectivo",
  periodo: new Date().toISOString().slice(0, 7),
  notas: "",
})

export default function PagosPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [estadoFilter, setEstadoFilter] = useState("")
  const [periodoFilter, setPeriodoFilter] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [showGenerarMes, setShowGenerarMes] = useState(false)
  const generarMesOverlayGuard = useOverlayMouseGuard(() => setShowGenerarMes(false))
  const [periodoMes, setPeriodoMes] = useState(new Date().toISOString().slice(0, 7))
  const [generarMesResult, setGenerarMesResult] = useState<Awaited<ReturnType<typeof pagosApi.generarMes>>["data"] | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [actionError, setActionError] = useState("")
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey: ["pagos", estadoFilter, periodoFilter, marcaFilter],
    queryFn: () => pagosApi.list({
      estado: estadoFilter || undefined,
      periodo: periodoFilter || undefined,
      marca: marcaFilter || undefined,
    }).then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(raw) ? raw : (raw as any)?.results ?? []

  useSetActiveBrand(selectedPago?.marca || (showForm && form.marca) || marcaFilter || null)

  const { data: sugerencias } = useQuery({
    queryKey: ["pagos-sugerencias"],
    queryFn: () => pagosApi.sugerencias().then(r => r.data),
  })
  const pendientesCount = sugerencias?.length ?? 0

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const alumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results ?? []

  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const pagadores: Pagador[] = Array.isArray(pagadoresRaw) ? pagadoresRaw : (pagadoresRaw as any)?.results ?? []

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results ?? []

  function onAlumnoChange(aid: number | "") {
    const a = aid !== "" ? alumnos.find(x => x.id === aid) : undefined
    setForm(f => ({ ...f, alumno: aid, pagador: a?.pagador ?? f.pagador }))
  }

  function openForm() { setForm(emptyForm()); setFormError(""); setShowForm(true) }
  function closeForm() { setShowForm(false); setFormError("") }

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos"] }); setActionError("") },
    onError: (err: any) => setActionError(err.response?.data?.error ?? "Error al marcar el pago como cobrado."),
  })

  const deleteMut = useMutation({
    mutationFn: pagosApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos"] }); setConfirmDelete(null); setDeleteError("") },
    onError: (err: any) => setDeleteError(err.response?.data?.error ?? "Error al eliminar el pago."),
  })

  const generarMut = useMutation({
    mutationFn: (p: Pago) => documentosApi.generar(p.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos"] }); setActionError("") },
    onError: (err: any) => setActionError(err.response?.data?.error ?? "Error al generar el documento."),
  })

  const generarMesMut = useMutation({
    mutationFn: (periodo: string) => pagosApi.generarMes(periodo),
    onSuccess: (res) => {
      setGenerarMesResult(res.data)
      qc.invalidateQueries({ queryKey: ["pagos"] })
    },
    onError: (err: any) => setGenerarMesResult({ periodo: periodoMes, creados: [], omitidos: [{ alumno: "", motivo: err.response?.data?.error ?? "Error al generar los pagos del mes." }] }),
  })

  const createMut = useMutation({
    mutationFn: (borrador: boolean) => {
      const importe = parseFloat(form.mensualidad) || 0
      return pagosApi.create({
        marca: form.marca as Marca,
        alumno: form.alumno === "" ? null : form.alumno,
        pagador: form.pagador === "" ? null : form.pagador,
        ...(form.grupo !== "" ? { grupo: form.grupo as number } : {}),
        periodo: form.periodo,
        mensualidad: importe,
        descuento: 0,
        extras: [],
        total: importe,
        metodo: form.metodo,
        notas: form.notas,
        estado: "pendiente",
        ...(borrador ? { guardar_como_borrador: true } : {}),
      })
    },
    onSuccess: (_res, borrador) => {
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["pagos-sugerencias"] })
      closeForm()
      if (borrador) navigate("/pagos/pendientes")
    },
    onError: (err: any) =>
      setFormError(err.response?.data?.detail ?? JSON.stringify(err.response?.data) ?? "Error al guardar el pago."),
  })

  function handleSubmit() {
    if (!form.marca) { setFormError("Elige la marca/emisor antes de guardar."); return }
    if (!form.alumno || !form.pagador || !form.periodo || !form.mensualidad) {
      setFormError("Alumno, pagador, periodo e importe son obligatorios.")
      return
    }
    setFormError("")
    createMut.mutate(false)
  }

  function handleSaveDraft() {
    if (!form.marca) { setFormError("Elige la marca/emisor antes de guardar, incluso como borrador."); return }
    if (!form.periodo) {
      setFormError("El periodo es obligatorio, incluso para un borrador.")
      return
    }
    setFormError("")
    createMut.mutate(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-subtitle">{pagos.length} registros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pendientesCount > 0 && (
            <button
              onClick={() => navigate("/pagos/pendientes")}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-[10px] bg-orange-100 text-orange-900 text-[15px] font-semibold hover:bg-orange-200"
            >
              ⚠ Revisar {pendientesCount} pendiente{pendientesCount === 1 ? "" : "s"}
            </button>
          )}
          <button
            onClick={() => { setShowGenerarMes(true); setGenerarMesResult(null) }}
            className="btn-ghost inline-flex items-center gap-2"
          >
            Generar pagos del mes
          </button>
          <button
            onClick={showForm ? closeForm : openForm}
            className="btn-primary inline-flex items-center gap-2"
          >
            {showForm ? "✕ Cancelar" : "+ Nuevo pago"}
          </button>
        </div>
      </div>

      {/* Generar pagos del mes modal */}
      {showGenerarMes && (
        <div className="modal-overlay" {...generarMesOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-head text-[22px] leading-tight text-pine-900">Generar pagos del mes</h2>
              <button onClick={() => setShowGenerarMes(false)} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>
            <p className="text-[15px] text-ink-soft mb-4">
              Crea un pago pendiente de facturar por cada alumno matriculado, usando la tarifa de su grupo.
              No se genera ningún número ni PDF todavía — solo el pago, listo para que lo revisen y confirmen.
              Si un alumno ya tiene un pago para este período, se omite (podés correrlo de nuevo sin duplicar nada).
            </p>
            {!generarMesResult ? (
              <>
                <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Período</label>
                <input type="month" value={periodoMes} onChange={e => setPeriodoMes(e.target.value)}
                  className="input mb-4" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowGenerarMes(false)} className="btn-ghost">
                    Cancelar
                  </button>
                  <button onClick={() => generarMesMut.mutate(periodoMes)} disabled={generarMesMut.isPending}
                    className="btn-primary disabled:opacity-50">
                    {generarMesMut.isPending ? "Generando..." : "Generar"}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[16px] font-semibold text-ink mb-2">
                  {generarMesResult.creados.length} pago{generarMesResult.creados.length === 1 ? "" : "s"} creado{generarMesResult.creados.length === 1 ? "" : "s"} para {generarMesResult.periodo}
                </p>
                {generarMesResult.creados.length > 0 && (
                  <ul className="text-[14px] text-ink mb-3 max-h-40 overflow-y-auto space-y-1">
                    {generarMesResult.creados.map(c => (
                      <li key={c.pago_id}>✓ {c.alumno} — {formatEur(Number(c.total))}</li>
                    ))}
                  </ul>
                )}
                {generarMesResult.omitidos.length > 0 && (
                  <>
                    <p className="font-label text-[14px] font-semibold text-amber-800 mb-1">Omitidos — revisar a mano:</p>
                    <ul className="text-[14px] text-amber-800 mb-3 max-h-40 overflow-y-auto space-y-1">
                      {generarMesResult.omitidos.map((o, i) => (
                        <li key={i}>⚠ {o.alumno ? `${o.alumno}: ` : ""}{o.motivo}</li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setShowGenerarMes(false)} className="btn-primary">
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card !bg-white p-6 mb-6">
          <h2 className="font-head text-[20px] leading-tight text-pine-900 mb-4">Nuevo pago</h2>
          {formError && (
            <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{formError}</p>
          )}
          <div className="mb-4">
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Marca / Emisor *</label>
            <select
              value={form.marca}
              onChange={e => setForm(f => ({ ...f, marca: e.target.value as Marca }))}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {MARCAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Alumno *</label>
              <select
                value={form.alumno}
                onChange={e => onAlumnoChange(e.target.value ? +e.target.value : "")}
                className="input"
              >
                <option value="">Seleccionar...</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Pagador *</label>
              <select
                value={form.pagador}
                onChange={e => setForm(f => ({ ...f, pagador: e.target.value ? +e.target.value : "" }))}
                className="input"
              >
                <option value="">Seleccionar...</option>
                {pagadores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Importe (€) *</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.mensualidad}
                onChange={e => setForm(f => ({ ...f, mensualidad: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Método</label>
              <select
                value={form.metodo}
                onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}
                className="input"
              >
                {METODOS.map(m => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Periodo *</label>
              <input
                type="month"
                value={form.periodo}
                onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Grupo</label>
              <select
                value={form.grupo}
                onChange={e => setForm(f => ({ ...f, grupo: e.target.value ? +e.target.value : "" }))}
                className="input"
              >
                <option value="">Sin grupo</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{grupoLabel(g)}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Notas</label>
            <textarea
              rows={2} placeholder="Observaciones..."
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              className="input !py-2.5 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm} className="btn-ghost">
              Cancelar
            </button>
            <button onClick={handleSaveDraft} disabled={createMut.isPending}
              title="Guarda lo que tengas hasta ahora sin alumno/pagador/grupo definitivos — no genera factura ni reserva número, aparece en Pagos pendientes"
              className="min-h-[44px] px-4 rounded-[10px] bg-orange-100 text-orange-900 text-[15px] font-semibold hover:bg-orange-200 disabled:opacity-50">
              {createMut.isPending ? "Guardando..." : "Guardar como borrador"}
            </button>
            <button onClick={handleSubmit} disabled={createMut.isPending}
              className="btn-primary disabled:opacity-50">
              {createMut.isPending ? "Guardando..." : "Crear pago"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="input !w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="parcial">Parcial</option>
        </select>
        <input
          type="month" value={periodoFilter}
          onChange={e => setPeriodoFilter(e.target.value)}
          className="input !w-auto"
        />
        {periodoFilter && (
          <button onClick={() => setPeriodoFilter("")} className="min-h-[40px] px-1 font-label text-[14px] font-semibold text-brass-700 hover:text-pine-900">
            Limpiar mes
          </button>
        )}
        <div className="inline-flex rounded-[10px] border border-pine-900/20 overflow-hidden">
          {([
            ["", "Todas"],
            ["rangers_academy", "Rangers Academy"],
            ["cami_and_co", "Cami & Co"],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setMarcaFilter(value)}
              className={`min-h-[44px] px-4 font-label text-[14px] font-semibold border-l border-pine-900/20 first:border-l-0 ${marcaFilter === value ? "bg-pine-900 text-khaki-100" : "bg-white text-pine-700 hover:bg-khaki-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{actionError}</p>
      )}

      {/* List */}
      {isLoading && <p className="text-ink-soft text-[15px] py-4">Cargando...</p>}

      {!isLoading && !pagos.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <p className="text-[15px]">Sin pagos registrados.</p>
        </div>
      )}

      {!isLoading && !!pagos.length && (
        <div className="card !bg-white overflow-x-auto">
          <table className="data-table [&_td]:!px-3 [&_th]:!px-3">
            <thead>
              <tr>
                {["Alumno", "Pagador", "Periodo", "Fecha de pago", "Importe", "Método", "Doc", "Estado", ""].map(h => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} onClick={() => setSelectedPago(p)} className="cursor-pointer">
                  <td className="font-semibold whitespace-nowrap">
                    {p.alumno && p.alumno_nombre ? (
                      <Link to={`/alumnos/${p.alumno}`} onClick={e => e.stopPropagation()} className="hover:text-brass-700 hover:underline">
                        {p.alumno_nombre}
                      </Link>
                    ) : (p.alumno_nombre ?? "—")}
                  </td>
                  <td className="!text-ink-soft">{p.pagador_nombre ?? "—"}</td>
                  <td className="!text-ink-soft">{formatMonth(p.periodo)}</td>
                  <td className="!text-ink-soft" title="Fecha de pago">{p.fecha ? formatDate(p.fecha) : "—"}</td>
                  <td className="font-semibold whitespace-nowrap">{formatEur(Number(p.total))}</td>
                  <td className="!text-ink-soft whitespace-nowrap">{METODO_LABEL[p.metodo] ?? p.metodo}</td>
                  <td className="font-mono !text-[13px] !text-ink-soft whitespace-nowrap">{p.num_doc || "—"}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                    <Badge estado={p.estado} />
                    {p.estado_carga === "pendiente_completar" && (
                      <span className="badge bg-orange-100 text-orange-900 whitespace-nowrap">
                        ⚠ Incompleto
                      </span>
                    )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5 justify-end">
                      {p.estado !== "pagado" && (
                        <button
                          onClick={() => marcarMut.mutate(p.id)}
                          disabled={marcarMut.isPending && marcarMut.variables === p.id}
                          className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border border-green-300 text-[14px] font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          ✓ Cobrar
                        </button>
                      )}
                      {!p.num_doc && (
                        <button
                          onClick={() => generarMut.mutate(p)}
                          disabled={generarMut.isPending && (generarMut.variables as Pago)?.id === p.id}
                          className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-2 rounded-[10px] border border-brass-500/50 text-[15px] text-brass-700 hover:bg-khaki-100 disabled:opacity-50 whitespace-nowrap"
                          title="Confirmar factura o recibo"
                        >
                          🧾
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(p.id)} aria-label="Eliminar pago" title="Eliminar pago"
                        className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-[10px] border border-red-200 text-[14px] text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete !== null && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-head text-[22px] leading-tight text-pine-900 mb-2">Eliminar pago</h3>
            <p className="text-[15px] text-ink-soft mb-4">Esta acción no se puede deshacer.</p>
            {deleteError && (
              <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError("") }}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete)}
                disabled={deleteMut.isPending}
                className="min-h-[44px] px-5 rounded-[10px] bg-red-700 text-white text-[15px] font-bold hover:bg-red-800 disabled:opacity-50"
              >
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pago detail/edit view — opened by clicking a row */}
      {selectedPago && (
        <PagoDetailModal pago={selectedPago} onClose={() => setSelectedPago(null)} />
      )}
    </div>
  )
}
