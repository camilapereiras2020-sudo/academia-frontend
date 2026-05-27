
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
  { value: "global", label: "Factura global mensual" },
  { value: "por_alumno", label: "Por alumno" },
  { value: "fundae", label: "FUNDAE" },
  { value: "mixta", label: "Mixta" },
]

const emptyEmpresa = { nombre: "", cif: "", email: "", telefono: "", direccion: "", facturacion: "global", notas: "" }
const emptyContacto = { nombre: "", cargo: "", email: "", telefono: "", notas: "" }

export default function EmpresasPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Empresa | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showContactoModal, setShowContactoModal] = useState(false)
  const [form, setForm] = useState(emptyEmpresa)
  const [contactoForm, setContactoForm] = useState(emptyContacto)

  const { data: raw, isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: () => api.get("/empresas/").then(r => r.data),
  })
  const empresas: Empresa[] = Array.isArray(raw) ? raw : raw?.results || []

  const { data: empresaDetalle } = useQuery<Empresa>({
    queryKey: ["empresa", selected?.id],
    queryFn: () => api.get(`/empresas/${selected?.id}/`).then(r => r.data),
    enabled: !!selected,
  })

  const { data: alumnosEmpresa } = useQuery({
    queryKey: ["empresa-alumnos", selected?.id],
    queryFn: () => api.get(`/empresas/${selected?.id}/alumnos/`).then(r => r.data),
    enabled: !!selected,
  })

  const crearEmpresa = useMutation({
    mutationFn: (data: any) => api.post("/empresas/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresas"] }); setShowModal(false); setForm(emptyEmpresa) },
  })

  const crearContacto = useMutation({
    mutationFn: (data: any) => api.post("/contactos-empresa/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresa", selected?.id] }); setShowContactoModal(false); setContactoForm(emptyContacto) },
  })

  const eliminarEmpresa = useMutation({
    mutationFn: (id: number) => api.delete(`/empresas/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresas"] }); setSelected(null) },
  })

  const inputStyle = {
    width: "100%", padding: "0.5rem 0.875rem", borderRadius: "8px",
    border: "1px solid var(--border-subtle, rgba(0,0,0,0.1))",
    background: "var(--dark-3, #F3F0EB)", color: "var(--text, #1A1714)",
    fontFamily: "DM Sans, sans-serif", fontSize: "0.875rem", outline: "none",
  }

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      {/* LEFT */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="page-title">Empresas</h1>
            <p className="page-subtitle">{empresas.length} empresas registradas</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nueva empresa</button>
        </div>

        {isLoading && <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Cargando...</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {empresas.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelected(emp)}
              className="card"
              style={{
                padding: "1rem 1.25rem",
                cursor: "pointer",
                borderColor: selected?.id === emp.id ? "var(--gold)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.95rem" }}>{emp.nombre}</p>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    {emp.cif && `${emp.cif} · `}{emp.num_alumnos} alumno{emp.num_alumnos !== 1 ? "s" : ""} · {emp.num_contactos} contacto{emp.num_contactos !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {emp.facturacion === "fundae" && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgba(176,141,87,0.15)", color: "var(--gold)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      FUNDAE
                    </span>
                  )}
                  {!emp.activa && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgba(0,0,0,0.06)", color: "var(--text-dim)" }}>
                      Inactiva
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Detail panel */}
      {selected && empresaDetalle && (
        <div style={{ width: "320px", flexShrink: 0 }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 400, color: "var(--text)" }}>{empresaDetalle.nombre}</h2>
                {empresaDetalle.cif && <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>CIF: {empresaDetalle.cif}</p>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>

            <div className="gold-line" style={{ marginBottom: "1rem" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              {empresaDetalle.email && <div><span style={{ color: "var(--text-dim)" }}>Email: </span><span style={{ color: "var(--text)" }}>{empresaDetalle.email}</span></div>}
              {empresaDetalle.telefono && <div><span style={{ color: "var(--text-dim)" }}>Tel: </span><span style={{ color: "var(--text)" }}>{empresaDetalle.telefono}</span></div>}
              {empresaDetalle.direccion && <div><span style={{ color: "var(--text-dim)" }}>Dir: </span><span style={{ color: "var(--text)" }}>{empresaDetalle.direccion}</span></div>}
              {empresaDetalle.facturacion && <div><span style={{ color: "var(--text-dim)" }}>Facturación: </span><span style={{ color: "var(--text)" }}>{FACTURACION_OPTS.find(f => f.value === empresaDetalle.facturacion)?.label}</span></div>}
              {empresaDetalle.notas && <div><span style={{ color: "var(--text-dim)" }}>Notas: </span><span style={{ color: "var(--text)" }}>{empresaDetalle.notas}</span></div>}
            </div>

            {/* Contactos */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Contactos</p>
                <button className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }} onClick={() => setShowContactoModal(true)}>+ Añadir</button>
              </div>
              {empresaDetalle.contactos?.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Sin contactos</p>}
              {empresaDetalle.contactos?.map(c => (
                <div key={c.id} style={{ padding: "0.6rem", borderRadius: "8px", background: "var(--surface)", marginBottom: "0.4rem" }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>{c.nombre || "Sin nombre"}</p>
                  {c.cargo && <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{c.cargo}</p>}
                  {c.telefono && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.telefono}</p>}
                  {c.email && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.email}</p>}
                  {c.notas && <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>{c.notas}</p>}
                </div>
              ))}
            </div>

            {/* Alumnos */}
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>Alumnos ({alumnosEmpresa?.length || 0})</p>
              {alumnosEmpresa?.map((a: any) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{a.nombre}</span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {a.es_fundae && <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem", borderRadius: "999px", background: "rgba(176,141,87,0.15)", color: "var(--gold)" }}>FUNDAE</span>}
                    {a.nivel && <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{a.nivel}</span>}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { if (confirm(`Eliminar ${empresaDetalle.nombre}?`)) eliminarEmpresa.mutate(empresaDetalle.id) }}
              className="btn-ghost"
              style={{ width: "100%", color: "#e53935", borderColor: "rgba(229,57,53,0.3)" }}
            >
              Eliminar empresa
            </button>
          </div>
        </div>
      )}

      {/* MODAL — Nueva empresa */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)" }}>Nueva empresa</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.3rem" }}>✕</button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "1.25rem" }}>Solo el nombre es obligatorio. El resto puedes completarlo después.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { key: "nombre", label: "Nombre *", placeholder: "Empresa S.L." },
                { key: "cif", label: "CIF", placeholder: "B12345678" },
                { key: "email", label: "Email", placeholder: "contacto@empresa.com" },
                { key: "telefono", label: "Teléfono", placeholder: "986 123 456" },
                { key: "direccion", label: "Dirección", placeholder: "C/ Mayor 1, Pontevedra" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Facturación</label>
                <select value={form.facturacion} onChange={e => setForm(p => ({ ...p, facturacion: e.target.value }))} style={inputStyle}>
                  {FACTURACION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => crearEmpresa.mutate(form)} disabled={!form.nombre || crearEmpresa.isPending}>
                {crearEmpresa.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Nuevo contacto */}
      {showContactoModal && selected && (
        <div className="modal-overlay" onClick={() => setShowContactoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)" }}>Nuevo contacto</h2>
              <button onClick={() => setShowContactoModal(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.3rem" }}>✕</button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "1.25rem" }}>Ningún campo es obligatorio.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { key: "nombre", label: "Nombre", placeholder: "Ana Martínez" },
                { key: "cargo", label: "Cargo", placeholder: "HR Manager" },
                { key: "email", label: "Email", placeholder: "ana@empresa.com" },
                { key: "telefono", label: "Teléfono", placeholder: "666 123 456" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>{f.label}</label>
                  <input value={contactoForm[f.key as keyof typeof contactoForm]} onChange={e => setContactoForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Notas</label>
                <textarea value={contactoForm.notas} onChange={e => setContactoForm(p => ({ ...p, notas: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowContactoModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => crearContacto.mutate({ ...contactoForm, empresa: selected.id })} disabled={crearContacto.isPending}>
                {crearContacto.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
