import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "../api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import { formatEur, formatMonth, formatDate } from "@/lib/utils"
import type { Pago, Alumno, Pagador, Grupo, Marca } from "@/types"
import PagoDetailModal from "../PagoDetailModal"

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
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLS[estado] ?? "bg-slate-100 text-slate-600"}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

const emptyForm = () => ({
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
  const [estadoFilter, setEstadoFilter] = useState("")
  const [periodoFilter, setPeriodoFilter] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos"] }),
  })

  const deleteMut = useMutation({
    mutationFn: pagosApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos"] }); setConfirmDelete(null); setDeleteError("") },
    onError: (err: any) => setDeleteError(err.response?.data?.error ?? "Error al eliminar el pago."),
  })

  const generarMut = useMutation({
    mutationFn: (p: Pago) => documentosApi.generar(p.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos"] }),
  })

  const createMut = useMutation({
    mutationFn: () => {
      const importe = parseFloat(form.mensualidad) || 0
      return pagosApi.create({
        alumno: form.alumno as number,
        pagador: form.pagador as number,
        ...(form.grupo !== "" ? { grupo: form.grupo as number } : {}),
        periodo: form.periodo,
        mensualidad: importe,
        descuento: 0,
        extras: [],
        total: importe,
        metodo: form.metodo,
        notas: form.notas,
        estado: "pendiente",
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos"] }); closeForm() },
    onError: (err: any) =>
      setFormError(err.response?.data?.detail ?? JSON.stringify(err.response?.data) ?? "Error al crear el pago."),
  })

  function handleSubmit() {
    if (!form.alumno || !form.pagador || !form.periodo || !form.mensualidad) {
      setFormError("Alumno, pagador, periodo e importe son obligatorios.")
      return
    }
    setFormError("")
    createMut.mutate()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pagos</h1>
          <p className="text-sm text-slate-500 mt-1">{pagos.length} registros</p>
        </div>
        <button
          onClick={showForm ? closeForm : openForm}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? "✕ Cancelar" : "+ Nuevo pago"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Nuevo pago</h2>
          {formError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Alumno *</label>
              <select
                value={form.alumno}
                onChange={e => onAlumnoChange(e.target.value ? +e.target.value : "")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Pagador *</label>
              <select
                value={form.pagador}
                onChange={e => setForm(f => ({ ...f, pagador: e.target.value ? +e.target.value : "" }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {pagadores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Importe (€) *</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.mensualidad}
                onChange={e => setForm(f => ({ ...f, mensualidad: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Método</label>
              <select
                value={form.metodo}
                onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {METODOS.map(m => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Periodo *</label>
              <input
                type="month"
                value={form.periodo}
                onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Grupo</label>
              <select
                value={form.grupo}
                onChange={e => setForm(f => ({ ...f, grupo: e.target.value ? +e.target.value : "" }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin grupo</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
            <textarea
              rows={2} placeholder="Observaciones..."
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={createMut.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
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
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="parcial">Parcial</option>
        </select>
        <input
          type="month" value={periodoFilter}
          onChange={e => setPeriodoFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {periodoFilter && (
          <button onClick={() => setPeriodoFilter("")} className="text-xs text-blue-600 hover:text-blue-800">
            Limpiar mes
          </button>
        )}
        <div className="inline-flex rounded-lg border overflow-hidden text-sm">
          {([
            ["", "Todas"],
            ["rangers_academy", "Rangers Academy"],
            ["cami_and_co", "Cami & Co"],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setMarcaFilter(value)}
              className={`px-3 py-2 ${marcaFilter === value ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && <p className="text-slate-400 text-sm py-4">Cargando...</p>}

      {!isLoading && !pagos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-4xl mb-3">💳</span>
          <p className="text-sm">Sin pagos registrados.</p>
        </div>
      )}

      {!isLoading && !!pagos.length && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Alumno", "Pagador", "Periodo", "Fecha de pago", "Importe", "Método", "Doc", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map(p => (
                <tr key={p.id} onClick={() => setSelectedPago(p)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.alumno_nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.pagador_nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatMonth(p.periodo)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap" title="Fecha de pago">{p.fecha ? formatDate(p.fecha) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{formatEur(Number(p.total))}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{METODO_LABEL[p.metodo] ?? p.metodo}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{p.num_doc || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge estado={p.estado} />
                    {p.estado_carga === "pendiente_completar" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 ml-1 whitespace-nowrap">
                        ⚠ Incompleto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      {p.estado !== "pagado" && (
                        <button
                          onClick={() => marcarMut.mutate(p.id)}
                          disabled={marcarMut.isPending && marcarMut.variables === p.id}
                          className="px-2 py-1 border rounded text-xs text-green-700 hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          ✓ Cobrar
                        </button>
                      )}
                      {!p.num_doc && (
                        <button
                          onClick={() => generarMut.mutate(p)}
                          disabled={generarMut.isPending && (generarMut.variables as Pago)?.id === p.id}
                          className="px-2 py-1 border rounded text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap"
                          title="Generar factura o recibo"
                        >
                          🧾
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="px-2 py-1 border rounded text-xs text-red-600 hover:bg-red-50"
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Eliminar pago</h3>
            <p className="text-sm text-slate-500 mb-4">Esta acción no se puede deshacer.</p>
            {deleteError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError("") }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
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
