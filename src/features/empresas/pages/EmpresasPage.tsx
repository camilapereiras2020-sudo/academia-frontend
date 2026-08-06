import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useState } from "react"

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

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

  return (
    <div className="flex gap-5">
      {/* LEFT — list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Empresas</h1>
            <p className="text-sm text-slate-700 mt-1">{empresas.length} empresas registradas</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            + Nueva empresa
          </button>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

        {!isLoading && !empresas.length && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-3">🏢</span>
            <p className="text-sm">Sin empresas registradas.</p>
          </div>
        )}

        <div className="space-y-2">
          {empresas.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelected(emp)}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:border-blue-300 transition-colors ${
                selected?.id === emp.id ? "border-blue-500 ring-1 ring-blue-200" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{emp.nombre}</p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {emp.cif && `${emp.cif} · `}
                    {emp.num_alumnos} alumno{emp.num_alumnos !== 1 ? "s" : ""} · {emp.num_contactos} contacto{emp.num_contactos !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 items-center">
                  {emp.facturacion === "fundae" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">FUNDAE</span>
                  )}
                  {!emp.activa && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactiva</span>
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
          <div className="bg-white rounded-xl border shadow-sm p-5 sticky top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{empresaDetalle.nombre}</h2>
                {empresaDetalle.cif && <p className="text-xs text-slate-700">CIF: {empresaDetalle.cif}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <div className="h-px bg-slate-100 mb-4" />

            <div className="space-y-1.5 text-sm mb-4">
              {empresaDetalle.email     && <p><span className="text-slate-600">Email: </span><span className="text-slate-700">{empresaDetalle.email}</span></p>}
              {empresaDetalle.telefono  && <p><span className="text-slate-600">Tel: </span><span className="text-slate-700">{empresaDetalle.telefono}</span></p>}
              {empresaDetalle.direccion && <p><span className="text-slate-600">Dir: </span><span className="text-slate-700">{empresaDetalle.direccion}</span></p>}
              {empresaDetalle.facturacion && (
                <p><span className="text-slate-600">Facturación: </span><span className="text-slate-700">{FACTURACION_OPTS.find(f => f.value === empresaDetalle.facturacion)?.label}</span></p>
              )}
              {empresaDetalle.notas && <p><span className="text-slate-600">Notas: </span><span className="text-slate-700">{empresaDetalle.notas}</span></p>}
            </div>

            {/* Contactos */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Contactos</p>
                <button
                  onClick={() => setShowContactoModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  + Añadir
                </button>
              </div>
              {(!empresaDetalle.contactos || empresaDetalle.contactos.length === 0) && (
                <p className="text-xs text-slate-600">Sin contactos</p>
              )}
              <div className="space-y-1.5">
                {empresaDetalle.contactos?.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-sm font-medium text-slate-800">{c.nombre || "Sin nombre"}</p>
                    {c.cargo    && <p className="text-xs text-slate-700">{c.cargo}</p>}
                    {c.telefono && <p className="text-xs text-slate-700">{c.telefono}</p>}
                    {c.email    && <p className="text-xs text-slate-700">{c.email}</p>}
                    {c.notas    && <p className="text-xs text-slate-600 mt-1">{c.notas}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Alumnos */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">
                Alumnos ({alumnosEmpresa.length})
              </p>
              {alumnosEmpresa.length === 0 && <p className="text-xs text-slate-600">Sin alumnos asignados</p>}
              <div className="divide-y divide-slate-100">
                {alumnosEmpresa.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-700">{a.nombre}</span>
                    <div className="flex gap-1">
                      {a.es_fundae && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">FUNDAE</span>}
                      {a.nivel     && <span className="text-xs text-slate-600">{a.nivel}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full border border-red-200 text-red-600 rounded-lg text-sm py-2 hover:bg-red-50">
                Eliminar empresa
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 mb-2">¿Eliminar <strong>{empresaDetalle.nombre}</strong>? No se puede deshacer.</p>
                {deleteError && <p className="text-xs text-red-700 mb-2">{deleteError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setConfirmDelete(false); setDeleteError("") }} className="flex-1 text-sm py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
                    Cancelar
                  </button>
                  <button
                    onClick={() => eliminarEmpresaMut.mutate(empresaDetalle.id)}
                    disabled={eliminarEmpresaMut.isPending}
                    className="flex-1 text-sm py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Nueva empresa</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-slate-600 mb-4 flex-shrink-0">Solo el nombre es obligatorio.</p>
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {([
                { key: "nombre",    label: "Nombre *",   placeholder: "Empresa S.L." },
                { key: "cif",       label: "CIF",        placeholder: "B12345678" },
                { key: "email",     label: "Email",      placeholder: "contacto@empresa.com" },
                { key: "telefono",  label: "Teléfono",   placeholder: "986 123 456" },
                { key: "direccion", label: "Dirección",  placeholder: "C/ Mayor 1, Pontevedra" },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facturación</label>
                <select value={form.facturacion} onChange={e => setForm(p => ({ ...p, facturacion: e.target.value }))} className={inputCls}>
                  {FACTURACION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
            {empresaError && <p className="text-red-600 text-xs mt-3 flex-shrink-0">{empresaError}</p>}
            <div className="flex gap-2 mt-4 flex-shrink-0">
              <button onClick={() => { setShowModal(false); setEmpresaError("") }} className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button
                onClick={() => crearEmpresaMut.mutate(form)}
                disabled={!form.nombre || crearEmpresaMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {crearEmpresaMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Nuevo contacto */}
      {showContactoModal && selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowContactoModal(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Nuevo contacto</h2>
              <button onClick={() => setShowContactoModal(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-3">
              {([
                { key: "nombre",   label: "Nombre",   placeholder: "Ana Martínez" },
                { key: "cargo",    label: "Cargo",    placeholder: "HR Manager" },
                { key: "email",    label: "Email",    placeholder: "ana@empresa.com" },
                { key: "telefono", label: "Teléfono", placeholder: "666 123 456" },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                  <input
                    value={contactoForm[f.key]}
                    onChange={e => setContactoForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas</label>
                <textarea value={contactoForm.notas} onChange={e => setContactoForm(p => ({ ...p, notas: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
            {contactoError && <p className="text-red-600 text-xs mt-3">{contactoError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowContactoModal(false); setContactoError("") }} className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button
                onClick={() => crearContactoMut.mutate({ ...contactoForm, empresa: selected.id })}
                disabled={crearContactoMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {crearContactoMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
