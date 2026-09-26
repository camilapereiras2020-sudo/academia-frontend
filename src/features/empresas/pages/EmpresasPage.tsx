import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useState } from "react"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

type Contacto = {
  id: number
  nombre: string
  cargo: string
  email: string
  telefono: string
  notas: string
}

type Empresa = {
  id: number
  nombre: string
  cif: string
  email: string
  telefono: string
  direccion: string
  facturacion: string
  notas: string
  activa: boolean
  num_alumnos: number
  num_contactos: number
  contactos?: Contacto[]
}

const FACTURACION_OPTS = [
  { value: "global",     label: "Factura global mensual" },
  { value: "por_alumno", label: "Por alumno" },
  { value: "fundae",     label: "FUNDAE" },
  { value: "mixta",      label: "Mixta" },
]

const emptyEmpresa  = { nombre: "", cif: "", email: "", telefono: "", direccion: "", facturacion: "global", notas: "" }
const emptyContacto = { nombre: "", cargo: "", email: "", telefono: "", notas: "" }

export default function EmpresasPage() {
  const qc = useQueryClient()
  const [selected, setSelected]             = useState<Empresa | null>(null)
  const [showModal, setShowModal]           = useState(false)
  const [showContactoModal, setShowContactoModal] = useState(false)
  const showModalOverlayGuard = useOverlayMouseGuard(() => setShowModal(false))
  const showContactoModalOverlayGuard = useOverlayMouseGuard(() => setShowContactoModal(false))
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [form, setForm]                     = useState(emptyEmpresa)
  const [contactoForm, setContactoForm]     = useState(emptyContacto)
  const [empresaError, setEmpresaError]     = useState("")
  const [contactoError, setContactoError]   = useState("")
  const [deleteError, setDeleteError]       = useState("")

  const { data: raw, isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: () => api.get("/empresas/").then(r => r.data),
  })
  const empresas: Empresa[] = Array.isArray(raw) ? raw : (raw as any)?.results ?? []

  const { data: empresaDetalle } = useQuery<Empresa>({
    queryKey: ["empresa", selected?.id],
    queryFn: () => api.get(`/empresas/${selected?.id}/`).then(r => r.data),
    enabled: !!selected,
  })

  const { data: alumnosRaw } = useQuery({
    queryKey: ["empresa-alumnos", selected?.id],
    queryFn: () => api.get(`/empresas/${selected?.id}/alumnos/`).then(r => r.data),
    enabled: !!selected,
  })
  const alumnosEmpresa: any[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results ?? []

  const crearEmpresaMut = useMutation({
    mutationFn: (data: typeof emptyEmpresa) => api.post("/empresas/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresas"] }); setShowModal(false); setForm(emptyEmpresa); setEmpresaError("") },
    onError: (err: any) => setEmpresaError(err.response?.data?.error ?? "Error al crear la empresa."),
  })

  const crearContactoMut = useMutation({
    mutationFn: (data: any) => api.post("/contactos-empresa/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresa", selected?.id] }); setShowContactoModal(false); setContactoForm(emptyContacto); setContactoError("") },
    onError: (err: any) => setContactoError(err.response?.data?.error ?? "Error al crear el contacto."),
  })

  const eliminarEmpresaMut = useMutation({
    mutationFn: (id: number) => api.delete(`/empresas/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresas"] }); setSelected(null); setConfirmDelete(false); setDeleteError("") },
    onError: (err: any) => setDeleteError(err.response?.data?.error ?? "Error al eliminar la empresa."),
  })

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 bg-white"

  return (
    <div className="flex gap-5">
      {/* LEFT — list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="page-title">Empresas</h1>
            <p className="page-subtitle">{empresas.length} empresas registradas</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary">
            + Nueva empresa
          </button>
        </div>

        {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}

        {!isLoading && !empresas.length && (
          <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
            <span className="text-5xl mb-3">🏢</span>
            <p className="text-[15px]">Sin empresas registradas.</p>
          </div>
        )}

        <div className="space-y-2">
          {empresas.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelected(emp)}
              className={`card !bg-white p-4 cursor-pointer hover:!border-brass-500 ${
                selected?.id === emp.id ? "!border-brass-500 ring-2 ring-brass-500/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-semibold text-ink">{emp.nombre}</p>
                  <p className="text-[14px] text-ink-soft mt-0.5">
                    {emp.cif && `${emp.cif} · `}
                    {emp.num_alumnos} alumno{emp.num_alumnos !== 1 ? "s" : ""} · {emp.num_contactos} contacto{emp.num_contactos !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 items-center">
                  {emp.facturacion === "fundae" && (
                    <span className="badge normal-case tracking-normal !text-[13px] bg-amber-100 text-amber-800">FUNDAE</span>
                  )}
                  {!emp.activa && (
                    <span className="badge normal-case tracking-normal !text-[13px] bg-khaki-200 text-pine-700">Inactiva</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      {selected && empresaDetalle && (
        <div className="w-80 flex-shrink-0">
          <div className="card !bg-white p-5 sticky top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-head text-[22px] leading-tight text-pine-900">{empresaDetalle.nombre}</h2>
                {empresaDetalle.cif && <p className="text-[14px] text-ink-soft">CIF: {empresaDetalle.cif}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>

            <div className="h-px bg-khaki-200 mb-4" />

            <div className="space-y-1.5 text-[15px] mb-4">
              {empresaDetalle.email     && <p><span className="text-pine-600">Email: </span><span className="text-pine-700">{empresaDetalle.email}</span></p>}
              {empresaDetalle.telefono  && <p><span className="text-pine-600">Tel: </span><span className="text-pine-700">{empresaDetalle.telefono}</span></p>}
              {empresaDetalle.direccion && <p><span className="text-pine-600">Dir: </span><span className="text-pine-700">{empresaDetalle.direccion}</span></p>}
              {empresaDetalle.facturacion && (
                <p><span className="text-pine-600">Facturación: </span><span className="text-pine-700">{FACTURACION_OPTS.find(f => f.value === empresaDetalle.facturacion)?.label}</span></p>
              )}
              {empresaDetalle.notas && <p><span className="text-pine-600">Notas: </span><span className="text-pine-700">{empresaDetalle.notas}</span></p>}
            </div>

            {/* Contactos */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700">Contactos</p>
                <button
                  onClick={() => setShowContactoModal(true)}
                  className="min-h-[40px] px-1 font-label text-[14px] font-semibold text-brass-700 hover:text-pine-900">
                  + Añadir
                </button>
              </div>
              {(!empresaDetalle.contactos || empresaDetalle.contactos.length === 0) && (
                <p className="text-[14px] text-ink-soft">Sin contactos</p>
              )}
              <div className="space-y-1.5">
                {empresaDetalle.contactos?.map(c => (
                  <div key={c.id} className="bg-khaki-100 rounded-[10px] px-3 py-2.5">
                    <p className="text-[15px] font-semibold text-ink">{c.nombre || "Sin nombre"}</p>
                    {c.cargo    && <p className="text-[14px] text-ink-soft">{c.cargo}</p>}
                    {c.telefono && <p className="text-[14px] text-ink-soft">{c.telefono}</p>}
                    {c.email    && <p className="text-[14px] text-ink-soft">{c.email}</p>}
                    {c.notas    && <p className="text-[14px] text-ink-soft mt-1">{c.notas}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Alumnos */}
            <div className="mb-4">
              <p className="font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-2">
                Alumnos ({alumnosEmpresa.length})
              </p>
              {alumnosEmpresa.length === 0 && <p className="text-[14px] text-ink-soft">Sin alumnos asignados</p>}
              <div className="divide-y divide-slate-100">
                {alumnosEmpresa.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5">
                    <span className="text-[15px] text-ink-soft">{a.nombre}</span>
                    <div className="flex gap-1">
                      {a.es_fundae && <span className="badge normal-case tracking-normal !text-[13px] bg-amber-100 text-amber-800">FUNDAE</span>}
                      {a.nivel     && <span className="text-[14px] text-ink-soft">{a.nivel}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full min-h-[44px] border border-red-200 text-red-700 rounded-[10px] text-[15px] font-semibold hover:bg-red-50">
                Eliminar empresa
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-3">
                <p className="text-[15px] text-red-700 mb-3">¿Eliminar <strong>{empresaDetalle.nombre}</strong>? No se puede deshacer.</p>
                {deleteError && <p className="text-[14px] text-red-700 mb-2">{deleteError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setConfirmDelete(false); setDeleteError("") }} className="btn-ghost flex-1 !bg-white">
                    Cancelar
                  </button>
                  <button
                    onClick={() => eliminarEmpresaMut.mutate(empresaDetalle.id)}
                    disabled={eliminarEmpresaMut.isPending}
                    className="flex-1 min-h-[44px] rounded-[10px] bg-red-700 text-white text-[15px] font-bold hover:bg-red-800 disabled:opacity-50">
                    {eliminarEmpresaMut.isPending ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL — Nueva empresa */}
      {showModal && (
        <div className="modal-overlay" {...showModalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="font-head text-[22px] leading-tight text-pine-900">Nueva empresa</h2>
              <button onClick={() => setShowModal(false)} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>
            <p className="text-[14px] text-ink-soft mb-4 flex-shrink-0">Solo el nombre es obligatorio.</p>
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {([
                { key: "nombre",    label: "Nombre *",   placeholder: "Empresa S.L." },
                { key: "cif",       label: "CIF",        placeholder: "B12345678" },
                { key: "email",     label: "Email",      placeholder: "contacto@empresa.com" },
                { key: "telefono",  label: "Teléfono",   placeholder: "986 123 456" },
                { key: "direccion", label: "Dirección",  placeholder: "C/ Mayor 1, Pontevedra" },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Facturación</label>
                <select value={form.facturacion} onChange={e => setForm(p => ({ ...p, facturacion: e.target.value }))} className={inputCls}>
                  {FACTURACION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
            {empresaError && <p className="text-red-700 text-[14px] mt-3 flex-shrink-0">{empresaError}</p>}
            <div className="flex gap-2 mt-4 flex-shrink-0">
              <button onClick={() => { setShowModal(false); setEmpresaError("") }} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button
                onClick={() => crearEmpresaMut.mutate(form)}
                disabled={!form.nombre || crearEmpresaMut.isPending}
                className="btn-primary flex-1 disabled:opacity-50">
                {crearEmpresaMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Nuevo contacto */}
      {showContactoModal && selected && (
        <div className="modal-overlay" {...showContactoModalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-head text-[22px] leading-tight text-pine-900">Nuevo contacto</h2>
              <button onClick={() => setShowContactoModal(false)} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-3">
              {([
                { key: "nombre",   label: "Nombre",   placeholder: "Ana Martínez" },
                { key: "cargo",    label: "Cargo",    placeholder: "HR Manager" },
                { key: "email",    label: "Email",    placeholder: "ana@empresa.com" },
                { key: "telefono", label: "Teléfono", placeholder: "666 123 456" },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">{f.label}</label>
                  <input
                    value={contactoForm[f.key]}
                    onChange={e => setContactoForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Notas</label>
                <textarea value={contactoForm.notas} onChange={e => setContactoForm(p => ({ ...p, notas: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
            {contactoError && <p className="text-red-700 text-[14px] mt-3">{contactoError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowContactoModal(false); setContactoError("") }} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button
                onClick={() => crearContactoMut.mutate({ ...contactoForm, empresa: selected.id })}
                disabled={crearContactoMut.isPending}
                className="btn-primary flex-1 disabled:opacity-50">
                {crearContactoMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
