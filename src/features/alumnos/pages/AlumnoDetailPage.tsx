import { useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { alumnosApi } from "../alumnos_api"
import { resumenApi, fechasImportantesApi, notasAlumnoApi, datoSaludApi, consentimientosApi } from "../ficha_api"
import { pagadoresApi } from "@/features/pagadores/api"
import EmailModal from "@/components/shared/EmailModal"
import WhatsappReplyModal from "../components/WhatsappReplyModal"
import { useAuthStore } from "@/store/authStore"
import { formatEur, formatDate, formatMonth, getInitials } from "@/lib/utils"
import type { TipoFechaImportante, TipoNotaAlumno, TipoConsentimiento, NivelObjetivo, ExamenObjetivo } from "@/types"

const NIVELES: NivelObjetivo[] = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EXAMENES: ExamenObjetivo[] = ["KET", "PET", "FCE", "CAE", "CPE", "ninguno"]

const TIPO_FECHA_LABELS: Record<TipoFechaImportante, string> = {
  examen: "Examen", revision_nivel: "Revisión de nivel",
  inicio_curso: "Inicio de curso", fin_curso: "Fin de curso", otro: "Otro",
}
const TIPO_FECHA_STYLE: Record<TipoFechaImportante, { background: string; color: string }> = {
  examen: { background: "var(--terracotta-muted)", color: "var(--terracotta)" },
  revision_nivel: { background: "var(--gold-muted)", color: "var(--gold)" },
  inicio_curso: { background: "var(--sage-muted)", color: "var(--sage)" },
  fin_curso: { background: "var(--sage-muted)", color: "var(--sage)" },
  otro: { background: "var(--surface)", color: "var(--text-dim)" },
}

const TIPO_NOTA_LABELS: Record<TipoNotaAlumno, string> = { progreso: "Progreso", reunion: "Reunión", general: "General" }

const TIPO_CONSENTIMIENTO_LABELS: Record<TipoConsentimiento, string> = {
  autorizacion_imagen: "Autorización de imagen",
  proteccion_datos: "Protección de datos",
  matricula: "Matrícula",
}
const CONSENTIMIENTO_TIPOS = Object.keys(TIPO_CONSENTIMIENTO_LABELS) as TipoConsentimiento[]

function age(fnac: string | null) {
  if (!fnac) return null
  const b = new Date(fnac), now = new Date()
  return now.getFullYear() - b.getFullYear() -
    (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

export default function AlumnoDetailPage() {
  const { id } = useParams()
  const alumnoId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore(s => s.user?.role)
  const canSeeSalud = role === "owner" || role === "co_manager"
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showWhatsappModal, setShowWhatsappModal] = useState(false)
  const [showFechaForm, setShowFechaForm] = useState(false)
  const [fechaForm, setFechaForm] = useState({ fecha: "", tipo: "examen" as TipoFechaImportante, descripcion: "" })
  const [showNotaForm, setShowNotaForm] = useState(false)
  const [notaForm, setNotaForm] = useState({ contenido: "", tipo: "general" as TipoNotaAlumno })
  const [saludForm, setSaludForm] = useState({ alergias: "", condiciones_medicas: "", medicacion: "" })
  const [saludEditing, setSaludEditing] = useState(false)
  const [periodoFilter, setPeriodoFilter] = useState("")

  const { data: alumno, isLoading: loadingAlumno } = useQuery({
    queryKey: ["alumno", alumnoId],
    queryFn: () => alumnosApi.get(alumnoId).then(r => r.data),
    enabled: !!alumnoId,
  })

  const { data: resumen } = useQuery({
    queryKey: ["alumno-resumen", alumnoId],
    queryFn: () => resumenApi.get(alumnoId).then(r => r.data),
    enabled: !!alumnoId,
  })

  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const pagadores = Array.isArray(pagadoresRaw) ? pagadoresRaw : []

  const { data: consentimientosRaw } = useQuery({
    queryKey: ["consentimientos-alumno", alumnoId],
    queryFn: () => consentimientosApi.list(alumnoId).then(r => r.data),
    enabled: !!alumnoId,
  })
  const consentimientos = Array.isArray(consentimientosRaw) ? consentimientosRaw : []

  const { data: salud } = useQuery({
    queryKey: ["alumno-salud", alumnoId],
    queryFn: () => datoSaludApi.get(alumnoId).then(r => r.data),
    enabled: !!alumnoId && canSeeSalud,
  })

  function openSaludEditing() {
    if (salud) setSaludForm({ alergias: salud.alergias, condiciones_medicas: salud.condiciones_medicas, medicacion: salud.medicacion })
    setSaludEditing(true)
  }

  const fotoMut = useMutation({
    mutationFn: (file: File) => alumnosApi.subirFoto(alumnoId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }),
  })

  const pagadorMut = useMutation({
    mutationFn: (pagadorId: number | null) => alumnosApi.update(alumnoId, { pagador: pagadorId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }),
  })

  const fechaMut = useMutation({
    mutationFn: () => fechasImportantesApi.create({ alumno: alumnoId, ...fechaForm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumno-resumen", alumnoId] })
      setShowFechaForm(false)
      setFechaForm({ fecha: "", tipo: "examen", descripcion: "" })
    },
  })

  const notaMut = useMutation({
    mutationFn: () => notasAlumnoApi.create({ alumno: alumnoId, ...notaForm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumno-resumen", alumnoId] })
      setShowNotaForm(false)
      setNotaForm({ contenido: "", tipo: "general" })
    },
  })

  const saludMut = useMutation({
    mutationFn: () => datoSaludApi.update(alumnoId, saludForm),
    onSuccess: (res) => {
      qc.setQueryData(["alumno-salud", alumnoId], res.data)
      setSaludEditing(false)
    },
  })

  const consentMut = useMutation({
    mutationFn: ({ tipo, firmado }: { tipo: TipoConsentimiento; firmado: boolean }) => {
      const existing = consentimientos.find(c => c.tipo === tipo)
      const fecha_firma = firmado ? new Date().toISOString().slice(0, 10) : null
      return existing
        ? consentimientosApi.update(existing.id, { firmado, fecha_firma })
        : consentimientosApi.create({ alumno: alumnoId, tipo, firmado, fecha_firma })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimientos-alumno", alumnoId] }),
  })

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) fotoMut.mutate(file)
    e.target.value = ""
  }

  if (loadingAlumno) return <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Cargando...</p>
  if (!alumno) return <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Alumno no encontrado.</p>

  const pagador = pagadores.find(p => p.id === alumno.pagador) ?? null
  const grupoDetalle = alumno.grupos_detalle?.[0] ?? null
  const yearsOld = age(alumno.fnac)
  const pagos = resumen?.pagos ?? []
  const fechas = resumen?.fechas_importantes ?? []
  const notas = resumen?.notas ?? []
  const periodos = Array.from(new Set(pagos.map(p => p.periodo))).sort().reverse()
  const pagosFiltrados = periodoFilter ? pagos.filter(p => p.periodo === periodoFilter) : pagos

  return (
    <div style={{ maxWidth: "56rem" }}>
      <button onClick={() => navigate("/alumnos")} className="btn-ghost" style={{ marginBottom: "1rem" }}>
        ← Volver a alumnos
      </button>

      {/* Header */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => fotoInputRef.current?.click()}
          disabled={fotoMut.isPending}
          style={{
            width: "5rem", height: "5rem", borderRadius: "50%", flexShrink: 0, border: "none", cursor: "pointer",
            background: alumno.foto_url ? `url(${alumno.foto_url}) center/cover` : "var(--gold-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", color: "var(--gold)",
            position: "relative", overflow: "hidden",
          }}
          title="Cambiar foto"
        >
          {!alumno.foto_url && getInitials(alumno.nombre)}
          {fotoMut.isPending && (
            <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.65rem" }}>
              Subiendo...
            </span>
          )}
        </button>
        <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFotoChange} style={{ display: "none" }} />

        <div style={{ flex: 1, minWidth: "12rem" }}>
          <h1 className="page-title">{alumno.nombre}</h1>
          <p className="page-subtitle">
            {[alumno.marca_display, grupoDetalle?.grupo_nombre, yearsOld !== null ? `${yearsOld} años` : null]
              .filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-ghost" disabled={!pagador?.email} onClick={() => setShowEmailModal(true)}>
            Enviar email
          </button>
          <button className="btn-ghost" onClick={() => setShowWhatsappModal(true)}>
            Generar respuesta WhatsApp
          </button>
        </div>
      </div>

      {/* Datos generales */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Datos generales
        </h2>
        <div className="grid-2col">
          <Field label="Contacto" value={[alumno.telefono, alumno.email].filter(Boolean).join(" · ") || "—"} />
          <Field label="DNI" value={alumno.dni || "—"} />
          <Field label="Nivel actual" value={alumno.nivel || "—"} />
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Nivel / examen objetivo</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select className="input" value={alumno.nivel_objetivo}
                onChange={e => alumnosApi.update(alumnoId, { nivel_objetivo: e.target.value as NivelObjetivo }).then(() => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }))}>
                <option value="">—</option>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="input" value={alumno.examen_objetivo}
                onChange={e => alumnosApi.update(alumnoId, { examen_objetivo: e.target.value as ExamenObjetivo }).then(() => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }))}>
                <option value="">—</option>
                {EXAMENES.map(ex => <option key={ex} value={ex}>{ex === "ninguno" ? "Ninguno" : ex}</option>)}
              </select>
            </div>
          </div>
          <Field label="Colegio de origen" value={alumno.colegio_origen || "—"} />
          <Field label="Idioma nativo" value={alumno.idioma_nativo || "—"} />
          <Field label="Contacto de emergencia"
            value={alumno.contacto_emergencia_nombre || alumno.contacto_emergencia_telefono
              ? `${alumno.contacto_emergencia_nombre} ${alumno.contacto_emergencia_telefono}`.trim()
              : "—"} />
        </div>
      </section>

      {/* Pagador */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Pagador
        </h2>
        {pagador ? (
          <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
            <p style={{ fontWeight: 500, color: "var(--text)" }}>{pagador.nombre}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
              {[pagador.telefono, pagador.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>Sin pagador vinculado.</p>
        )}
        <select className="input" value={alumno.pagador ?? ""}
          onChange={e => pagadorMut.mutate(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Sin pagador asignado</option>
          {pagadores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </section>

      {/* Pagos */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Pagos</h2>
          {periodos.length > 0 && (
            <select className="input" style={{ width: "auto" }} value={periodoFilter} onChange={e => setPeriodoFilter(e.target.value)}>
              <option value="">Todos los periodos</option>
              {periodos.map(p => <option key={p} value={p}>{formatMonth(p)}</option>)}
            </select>
          )}
        </div>
        {!pagosFiltrados.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Sin pagos registrados.</p>}
        {!!pagosFiltrados.length && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr>{["Periodo", "Importe", "Método", "Estado", "Doc"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {pagosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td>{formatMonth(p.periodo)}</td>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{formatEur(Number(p.total))}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.metodo}</td>
                    <td><span className="badge" style={p.estado === "pagado" ? { background: "var(--sage-muted)", color: "var(--sage)" } : { background: "var(--terracotta-muted)", color: "var(--terracotta)" }}>{p.estado}</span></td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{p.num_doc || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Académico */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Académico</h2>
          {!showFechaForm && <button className="btn-ghost" onClick={() => setShowFechaForm(true)}>+ añadir fecha</button>}
        </div>

        {showFechaForm && (
          <div className="card" style={{ padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input type="date" className="input" style={{ width: "auto" }} value={fechaForm.fecha}
                onChange={e => setFechaForm(f => ({ ...f, fecha: e.target.value }))} />
              <select className="input" style={{ width: "auto" }} value={fechaForm.tipo}
                onChange={e => setFechaForm(f => ({ ...f, tipo: e.target.value as TipoFechaImportante }))}>
                {Object.entries(TIPO_FECHA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <input type="text" className="input" placeholder="Descripción (opcional)" value={fechaForm.descripcion}
              onChange={e => setFechaForm(f => ({ ...f, descripcion: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-ghost" onClick={() => setShowFechaForm(false)}>Cancelar</button>
              <button className="btn-primary" disabled={!fechaForm.fecha || fechaMut.isPending} onClick={() => fechaMut.mutate()}>Guardar</button>
            </div>
          </div>
        )}

        {!fechas.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: "1rem" }}>Sin fechas importantes registradas.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {fechas.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="badge" style={TIPO_FECHA_STYLE[f.tipo]}>{f.tipo_display}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>{formatDate(f.fecha)}</span>
              {f.descripcion && <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{f.descripcion}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)" }}>Notas de progreso</p>
          {!showNotaForm && <button className="btn-ghost" onClick={() => setShowNotaForm(true)}>+ añadir</button>}
        </div>
        {showNotaForm && (
          <div className="card" style={{ padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <select className="input" style={{ width: "auto" }} value={notaForm.tipo}
              onChange={e => setNotaForm(f => ({ ...f, tipo: e.target.value as TipoNotaAlumno }))}>
              {Object.entries(TIPO_NOTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea rows={2} className="input" style={{ resize: "none" }} placeholder="Progreso, tema cubierto..."
              value={notaForm.contenido} onChange={e => setNotaForm(f => ({ ...f, contenido: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-ghost" onClick={() => setShowNotaForm(false)}>Cancelar</button>
              <button className="btn-primary" disabled={!notaForm.contenido.trim() || notaMut.isPending} onClick={() => notaMut.mutate()}>Guardar</button>
            </div>
          </div>
        )}
        {!notas.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Sin notas de progreso.</p>}
      </section>

      {/* Notas / reuniones (timeline) */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Notas y reuniones
        </h2>
        {!notas.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Sin registros.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notas.map(n => (
            <div key={n.id} style={{ borderLeft: "2px solid var(--border)", paddingLeft: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                <span className="badge" style={{ background: "var(--surface)", color: "var(--text-dim)" }}>{n.tipo_display}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{formatDate(n.fecha)} · {n.autor_nombre}</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text)" }}>{n.contenido}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Documentos / Consentimientos */}
      <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Documentos y consentimientos
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {CONSENTIMIENTO_TIPOS.map(tipo => {
            const c = consentimientos.find(x => x.tipo === tipo)
            const firmado = c?.firmado ?? false
            return (
              <div key={tipo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input type="checkbox" checked={firmado} onChange={e => consentMut.mutate({ tipo, firmado: e.target.checked })} />
                  <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>{TIPO_CONSENTIMIENTO_LABELS[tipo]}</span>
                  {c?.documento_url && <a href={c.documento_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "var(--gold)" }}>Ver documento</a>}
                </div>
                <span className="badge" style={firmado ? { background: "var(--sage-muted)", color: "var(--sage)" } : { background: "var(--terracotta-muted)", color: "var(--terracotta)" }}>
                  {firmado ? `Firmado${c?.fecha_firma ? " · " + formatDate(c.fecha_firma) : ""}` : "Pendiente"}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Salud — never rendered for reception */}
      {canSeeSalud && (
        <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Salud</h2>
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontStyle: "italic", marginTop: "0.25rem" }}>
              Dato sensible — visibilidad restringida
            </p>
          </div>
          {saludEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Textarea label="Alergias" value={saludForm.alergias} onChange={v => setSaludForm(f => ({ ...f, alergias: v }))} />
              <Textarea label="Condiciones médicas" value={saludForm.condiciones_medicas} onChange={v => setSaludForm(f => ({ ...f, condiciones_medicas: v }))} />
              <Textarea label="Medicación" value={saludForm.medicacion} onChange={v => setSaludForm(f => ({ ...f, medicacion: v }))} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button className="btn-ghost" onClick={() => setSaludEditing(false)}>Cancelar</button>
                <button className="btn-primary" disabled={saludMut.isPending} onClick={() => saludMut.mutate()}>Guardar</button>
              </div>
            </div>
          ) : (
            <div>
              <Field label="Alergias" value={salud?.alergias || "—"} />
              <Field label="Condiciones médicas" value={salud?.condiciones_medicas || "—"} />
              <Field label="Medicación" value={salud?.medicacion || "—"} />
              <button className="btn-ghost" style={{ marginTop: "0.5rem" }} onClick={openSaludEditing}>Editar</button>
            </div>
          )}
        </section>
      )}

      {showEmailModal && pagador?.email && (
        <EmailModal
          to={pagador.email}
          onSend={(asunto, cuerpo) => alumnosApi.enviarEmail(alumnoId, asunto, cuerpo).then(() => {})}
          onClose={() => setShowEmailModal(false)}
        />
      )}
      {showWhatsappModal && (
        <WhatsappReplyModal
          alumno={alumno}
          pagadorNombre={pagador?.nombre ?? null}
          grupoNombre={grupoDetalle?.grupo_nombre ?? null}
          onClose={() => setShowWhatsappModal(false)}
        />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.2rem" }}>{label}</p>
      <p style={{ fontSize: "0.875rem", color: "var(--text)" }}>{value}</p>
    </div>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>{label}</p>
      <textarea rows={2} className="input" style={{ resize: "none" }} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
