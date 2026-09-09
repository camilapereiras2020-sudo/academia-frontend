import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { alumnosApi } from "../alumnos_api"
import { resumenApi, fechasImportantesApi, notasAlumnoApi, datoSaludApi, consentimientosApi } from "../ficha_api"
import { pagadoresApi } from "@/features/pagadores/api"
import PagadorCombobox from "@/features/pagadores/PagadorCombobox"
import PagadorFieldsEditor, { type PagadorDraft } from "@/features/pagadores/PagadorFieldsEditor"
import EmailModal from "@/components/shared/EmailModal"
import WhatsappReplyModal from "../components/WhatsappReplyModal"
import { useAuthStore } from "@/store/authStore"
import { NivelSelect } from "@/features/niveles/NivelSelect"
import { api } from "@/lib/axios"
import { formatEur, formatDate, formatMonth, getInitials } from "@/lib/utils"
import type { TipoFechaImportante, TipoNotaAlumno, TipoConsentimiento, NivelObjetivo, ExamenObjetivo, Curso } from "@/types"

const DIA_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const NIVELES: NivelObjetivo[] = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EXAMENES: ExamenObjetivo[] = ["KET", "PET", "FCE", "CAE", "CPE", "ninguno"]
const CURSOS: { value: Curso; label: string }[] = [
  { value: "infantil_3", label: "Infantil 3 años" }, { value: "infantil_4", label: "Infantil 4 años" },
  { value: "infantil_5", label: "Infantil 5 años" },
  { value: "primaria_1", label: "1º Primaria" }, { value: "primaria_2", label: "2º Primaria" },
  { value: "primaria_3", label: "3º Primaria" }, { value: "primaria_4", label: "4º Primaria" },
  { value: "primaria_5", label: "5º Primaria" }, { value: "primaria_6", label: "6º Primaria" },
  { value: "eso_1", label: "1º ESO" }, { value: "eso_2", label: "2º ESO" },
  { value: "eso_3", label: "3º ESO" }, { value: "eso_4", label: "4º ESO" },
  { value: "bach_1", label: "1º Bachillerato" }, { value: "bach_2", label: "2º Bachillerato" },
  { value: "fp", label: "Formación Profesional" }, { value: "adulto", label: "Adulto" }, { value: "otro", label: "Otro" },
]
// Público/concertado/privado en Pontevedra y Poio — recopilado a mano
// (paxinasgalegas.es, agosto 2026), puede faltar algún centro nuevo o de
// otro ayuntamiento cercano. Por eso "Colegio de origen" sigue siendo texto
// libre con estas como sugerencias (datalist), nunca un desplegable cerrado.
const COLEGIOS_SUGERIDOS = [
  // Pontevedra — público
  "CEIP A Carballeira", "CEIP A Xunqueira Nº 1", "CEIP A Xunqueira Nº 2", "CEIP Álvarez Limeses",
  "CEIP Daría González García", "CEIP de Cabanas", "CEIP de Marcón", "CEIP Froebel",
  "CEIP Manuel Vidal Portela", "CEIP Parada-Campañó", "CEIP Pontesampaio", "CEIP Pza. Barcelos",
  "CEIP San Benito de Lérez", "CEIP San Martiño", "CEIP Santo André de Xeve", "CEIP Vilaverde-Mourente",
  "CEP Campolongo", "CEP Marcos da Portela", "CEE Amencer", "CEE Juan XXIII",
  // Pontevedra — concertado
  "CPR Calasancio", "CPR Nuestra Señora de los Dolores (Doroteas)", "CPR Sagrado Corazón de Jesús",
  "CPR Sagrado Corazón de Placeres", "CPR San José",
  // Pontevedra — privado
  "Colegio Santa Apolonia", "Colegio Juan Sebastián Elcano", "Colegio Los Sauces",
  // Poio — público
  "CEIP de Espedregada", "CEIP de Lourido", "CEIP de Viñas", "CEIP Isidora Riestra",
  "CEIP Plurilingüe de Chancelas", "IES de Poio",
  // Poio — privado
  "CPR Sek Atlántico",
]

type Documento = {
  id: number
  nombre: string
  tipo: string
  num_doc: string
  emitida_at: string | null
  estado: string
  drive_url?: string | null
  pago_info?: { alumno: string; pagador: string; periodo: string; total: string | number; fecha: string | null }
}
const DOC_TIPO_LABEL: Record<string, string> = {
  factura: "Factura", recibo: "Recibo", recibo_efectivo: "Recibo (efectivo)",
}
function formatDocFecha(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const emptyPagadorDraft = (): PagadorDraft => ({ telefono: "", email: "", direccion: "", nif: "" })

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
  politica_cancelacion: "Política de cancelación",
}
const CONSENTIMIENTO_TIPOS = Object.keys(TIPO_CONSENTIMIENTO_LABELS) as TipoConsentimiento[]
// Tipos con PDF autorrellenable (backend: AlumnoViewSet.documento_legal). Los
// otros dos (proteccion_datos, matricula) todavía no tienen un renderer —
// solo se marca la casilla a mano cuando vuelve el papel firmado.
const TIPOS_CON_PDF: TipoConsentimiento[] = ["autorizacion_imagen", "politica_cancelacion"]

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
  const [generalEditing, setGeneralEditing] = useState(false)
  const [imprimiendoTipo, setImprimiendoTipo] = useState<TipoConsentimiento | null>(null)
  const [imprimirError, setImprimirError] = useState("")
  const [generalForm, setGeneralForm] = useState({
    nombre: "", telefono: "", email: "", dni: "", notas: "", es_adulto: false,
    colegio_origen: "", idioma_nativo: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "",
    nivel: "", nivel_objetivo: "" as NivelObjetivo | "", examen_objetivo: "" as ExamenObjetivo | "", curso: "" as Curso | "",
  })
  const [pagadorDraft, setPagadorDraft] = useState<PagadorDraft>(emptyPagadorDraft())
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null)
  const [downloadDocError, setDownloadDocError] = useState("")

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

  const { data: documentosRaw } = useQuery({
    queryKey: ["documentos", "alumno", alumnoId],
    queryFn: () => api.get<Documento[]>(`/documentos/?alumno=${alumnoId}`).then(r => r.data),
    enabled: !!alumnoId,
  })
  const documentos: Documento[] = Array.isArray(documentosRaw) ? documentosRaw : []

  async function handleDescargarDoc(d: Documento) {
    setDownloadingDocId(d.id)
    setDownloadDocError("")
    try {
      const res = await api.get(`/documentos/${d.id}/descargar/`, { responseType: "blob" })
      const url = window.URL.createObjectURL(res.data as Blob)
      const cliente = d.pago_info?.alumno || d.pago_info?.pagador || ""
      const filename = `${d.num_doc || d.nombre}${cliente ? " " + cliente : ""}.pdf`.replace(/[\\/:*?"<>|]/g, "")
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch {
      setDownloadDocError("No se pudo descargar el documento.")
    } finally {
      setDownloadingDocId(null)
    }
  }

  const pagador = pagadores.find(p => p.id === alumno?.pagador) ?? null

  // Keep the payer sub-section's editable fields in sync with whichever
  // Pagador is currently linked (switching via the combobox, or the alumno
  // query refetching after a save) — same "resync on selection change" idea
  // as AlumnosPage's selectPagador, just event-driven instead of onChange-driven
  // since this page loads the linked pagador from a query rather than local state.
  useEffect(() => {
    setPagadorDraft(pagador
      ? { telefono: pagador.telefono, email: pagador.email, direccion: pagador.direccion, nif: pagador.nif }
      : emptyPagadorDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagador?.id])

  function openSaludEditing() {
    if (salud) setSaludForm({ alergias: salud.alergias, condiciones_medicas: salud.condiciones_medicas, medicacion: salud.medicacion })
    setSaludEditing(true)
  }

  function openGeneralEditing() {
    if (alumno) {
      setGeneralForm({
        nombre: alumno.nombre, telefono: alumno.telefono ?? "", email: alumno.email ?? "",
        dni: alumno.dni ?? "", notas: alumno.notas ?? "", es_adulto: alumno.es_adulto ?? false,
        colegio_origen: alumno.colegio_origen ?? "", idioma_nativo: alumno.idioma_nativo ?? "",
        contacto_emergencia_nombre: alumno.contacto_emergencia_nombre ?? "",
        contacto_emergencia_telefono: alumno.contacto_emergencia_telefono ?? "",
        nivel: alumno.nivel ?? "", nivel_objetivo: alumno.nivel_objetivo ?? "",
        examen_objetivo: alumno.examen_objetivo ?? "", curso: alumno.curso ?? "",
      })
    }
    setGeneralEditing(true)
  }

  const fotoMut = useMutation({
    mutationFn: (file: File) => alumnosApi.subirFoto(alumnoId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }),
  })

  const generalMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...generalForm }
      // Just switched from minor to adult self-pay: clear any existing payer
      // link so the backend auto-creates/links a fresh one from this alumno's
      // own (just-saved) contact data, instead of leaving a stale minor-payer
      // link behind. Already-adult alumnos keep whatever link they have.
      if (generalForm.es_adulto && !alumno?.es_adulto) {
        payload.pagador = null
      }
      return alumnosApi.update(alumnoId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumno", alumnoId] })
      qc.invalidateQueries({ queryKey: ["pagadores"] })
      setGeneralEditing(false)
    },
  })

  const pagadorMut = useMutation({
    mutationFn: (pagadorId: number | null) => alumnosApi.update(alumnoId, { pagador: pagadorId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }),
  })

  // Ex-alumno toggle — soft flag, nothing is deleted. A deactivated student
  // stays fully in the system (invoices, history, notes) but drops out of
  // the default Alumnos list and off the active roster; reactivating needs
  // no confirmation since it's harmless to undo.
  const [confirmExAlumno, setConfirmExAlumno] = useState(false)
  const [motivoBaja, setMotivoBaja] = useState("")

  const marcarExAlumnoMut = useMutation({
    mutationFn: async (motivo: string) => {
      // Unenroll from every class first (same op the Horario roster's ✕
      // uses) so they drop off the schedule, then flag the alumno itself.
      for (const g of alumno?.grupos_detalle ?? []) {
        await alumnosApi.quitarGrupo(alumnoId, g.grupo)
      }
      return alumnosApi.update(alumnoId, {
        activo: false, motivo_baja: motivo.trim(), fecha_baja: new Date().toISOString().slice(0, 10),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumno", alumnoId] })
      qc.invalidateQueries({ queryKey: ["grupos"] })
      setConfirmExAlumno(false)
      setMotivoBaja("")
    },
  })

  const reactivarMut = useMutation({
    mutationFn: () => alumnosApi.update(alumnoId, { activo: true, motivo_baja: "", fecha_baja: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumno", alumnoId] }),
  })

  const pagadorFieldsMut = useMutation({
    mutationFn: () => {
      if (!pagador) return Promise.resolve(null)
      return pagadoresApi.update(pagador.id, pagadorDraft)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagadores"] }),
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

  // Abre en una pestaña nueva el PDF autorrellenado (nombre, fecha de
  // nacimiento, grupo, pagador, datos reales de la marca) listo para
  // imprimir y firmar a mano — mismo patrón fetch+blob que
  // DocumentosPage.handleDescargar, porque el endpoint exige el Bearer
  // token y un <a href> plano no lo manda.
  async function handleImprimirDocumento(tipo: TipoConsentimiento) {
    setImprimirError("")
    setImprimiendoTipo(tipo)
    const nuevaVentana = window.open("", "_blank")
    try {
      const token = localStorage.getItem("access_token")
      const base = import.meta.env.VITE_API_URL ?? "/api/v1"
      const res = await fetch(`${base}/alumnos/${alumnoId}/documento-legal/${tipo}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`No se pudo generar el documento (código ${res.status}).`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      if (nuevaVentana) nuevaVentana.location.href = url
      else window.open(url, "_blank")
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch (err) {
      nuevaVentana?.close()
      setImprimirError(err instanceof Error ? err.message : "Error al generar el documento.")
    } finally {
      setImprimiendoTipo(null)
    }
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) fotoMut.mutate(file)
    e.target.value = ""
  }

  if (loadingAlumno) return <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Cargando...</p>
  if (!alumno) return <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Alumno no encontrado.</p>

  const gruposDetalle = alumno.grupos_detalle ?? []
  const grupoDetalle = gruposDetalle[0] ?? null // used only for the WhatsApp-reply modal's context line
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
      <div className="card" style={{ padding: "1.1rem", marginBottom: "1rem", display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
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
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {alumno.nombre}
            {alumno.activo === false && (
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                padding: "0.15rem 0.5rem", borderRadius: "999px", background: "#f1e4d0", color: "#7a5a2c",
              }}>
                Ex-alumno
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            {[alumno.marca_display, yearsOld !== null ? `${yearsOld} años` : null]
              .filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
          {alumno.activo === false && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
              Baja{alumno.fecha_baja ? ` el ${new Date(alumno.fecha_baja).toLocaleDateString("es-ES")}` : ""}
              {alumno.motivo_baja ? ` — ${alumno.motivo_baja}` : ""}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-ghost" disabled={!pagador?.email} onClick={() => setShowEmailModal(true)}>
            Enviar email
          </button>
          <button className="btn-ghost" onClick={() => setShowWhatsappModal(true)}>
            Generar respuesta WhatsApp
          </button>
          {alumno.activo === false ? (
            <button className="btn-ghost" disabled={reactivarMut.isPending} onClick={() => reactivarMut.mutate()}>
              Reactivar alumno
            </button>
          ) : (
            <button className="btn-ghost" disabled={marcarExAlumnoMut.isPending} onClick={() => setConfirmExAlumno(true)}>
              Marcar como ex-alumno
            </button>
          )}
        </div>
      </div>

      {confirmExAlumno && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-pine-900 mb-1">Marcar como ex-alumno</h3>
            <p className="text-sm text-pine-800 mb-3">
              {alumno.nombre} se dará de baja de {gruposDetalle.length
                ? `sus ${gruposDetalle.length} clase${gruposDetalle.length === 1 ? "" : "s"}`
                : "el horario"} y dejará de aparecer en la lista de alumnos activos por defecto. Sus datos,
              facturas e historial se conservan tal cual — podés reactivarlo cuando quieras.
            </p>
            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "0.3rem" }}>
              Motivo (opcional)
            </label>
            <textarea value={motivoBaja} onChange={e => setMotivoBaja(e.target.value)} rows={3}
              placeholder="Se muda de ciudad, cambia de academia, termina el curso..."
              className="w-full border border-khaki-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brass-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setConfirmExAlumno(false); setMotivoBaja("") }}
                className="px-4 py-2 rounded-lg bg-khaki-200 text-pine-800 text-sm hover:bg-khaki-300">
                Cancelar
              </button>
              <button onClick={() => marcarExAlumnoMut.mutate(motivoBaja)} disabled={marcarExAlumnoMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
                {marcarExAlumnoMut.isPending ? "Guardando…" : "Marcar como ex-alumno"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horario — a student can be in more than one class a week now, so this
          lists every current membership, not just a "primary" one. */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>
            Horario ({gruposDetalle.length})
          </h2>
          <button className="btn-ghost" onClick={() => navigate(`/horario?alumno=${id}`)}>Editar en Horario →</button>
        </div>
        {!gruposDetalle.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Sin clases asignadas todavía.</p>}
        {!!gruposDetalle.length && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {gruposDetalle.map(g => (
              <div key={g.grupo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>{g.grupo_nombre}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {g.horarios.length
                    ? g.horarios.map((h, i) => <span key={i}>{i > 0 ? " · " : ""}{DIA_LABELS[h.dia]} {h.ini}–{h.fin}</span>)
                    : "Sin horario configurado"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Datos generales */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>
            Datos generales
          </h2>
          {!generalEditing && <button className="btn-ghost" onClick={openGeneralEditing}>Editar</button>}
        </div>

        {generalEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
            <div className="grid-2col">
              <TextInput label="Nombre" value={generalForm.nombre} onChange={v => setGeneralForm(f => ({ ...f, nombre: v }))} />
              <TextInput label="DNI" value={generalForm.dni} onChange={v => setGeneralForm(f => ({ ...f, dni: v }))} />
              <TextInput label="Teléfono" value={generalForm.telefono} onChange={v => setGeneralForm(f => ({ ...f, telefono: v }))} />
              <TextInput label="Email" value={generalForm.email} onChange={v => setGeneralForm(f => ({ ...f, email: v }))} />
              <div>
                <TextInput label="Colegio de origen" value={generalForm.colegio_origen}
                  onChange={v => setGeneralForm(f => ({ ...f, colegio_origen: v }))} listId="colegios-sugeridos" />
                <datalist id="colegios-sugeridos">
                  {COLEGIOS_SUGERIDOS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Curso</p>
                <select className="input" value={generalForm.curso}
                  onChange={e => setGeneralForm(f => ({ ...f, curso: e.target.value as Curso }))}>
                  <option value="">—</option>
                  {CURSOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <TextInput label="Idioma nativo" value={generalForm.idioma_nativo} onChange={v => setGeneralForm(f => ({ ...f, idioma_nativo: v }))} />
              <TextInput label="Contacto de emergencia (nombre)" value={generalForm.contacto_emergencia_nombre} onChange={v => setGeneralForm(f => ({ ...f, contacto_emergencia_nombre: v }))} />
              <TextInput label="Contacto de emergencia (teléfono)" value={generalForm.contacto_emergencia_telefono} onChange={v => setGeneralForm(f => ({ ...f, contacto_emergencia_telefono: v }))} />
              <div>
                <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Nivel actual</p>
                <NivelSelect className="input" value={generalForm.nivel}
                  onChange={v => setGeneralForm(f => ({ ...f, nivel: v }))} />
              </div>
              <div>
                <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>Nivel / examen objetivo</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select className="input" value={generalForm.nivel_objetivo}
                    onChange={e => setGeneralForm(f => ({ ...f, nivel_objetivo: e.target.value as NivelObjetivo | "" }))}>
                    <option value="">—</option>
                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select className="input" value={generalForm.examen_objetivo}
                    onChange={e => setGeneralForm(f => ({ ...f, examen_objetivo: e.target.value as ExamenObjetivo | "" }))}>
                    <option value="">—</option>
                    {EXAMENES.map(ex => <option key={ex} value={ex}>{ex === "ninguno" ? "Ninguno" : ex}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <Textarea label="Notas" value={generalForm.notas} onChange={v => setGeneralForm(f => ({ ...f, notas: v }))} />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={generalForm.es_adulto}
                onChange={e => setGeneralForm(f => ({ ...f, es_adulto: e.target.checked }))} />
              El alumno es adulto / paga el mismo
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-ghost" onClick={() => setGeneralEditing(false)}>Cancelar</button>
              <button className="btn-primary" disabled={!generalForm.nombre.trim() || generalMut.isPending} onClick={() => generalMut.mutate()}>
                {generalMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid-2col">
          <Field label="Contacto" value={[alumno.telefono, alumno.email].filter(Boolean).join(" · ") || "—"} />
          <Field label="DNI" value={alumno.dni || "—"} />
          <Field label="¿Es adulto / paga el mismo?" value={alumno.es_adulto ? "Sí" : "No"} />
          <Field label="Nivel actual" value={alumno.nivel || "—"} />
          <Field label="Nivel / examen objetivo"
            value={[alumno.nivel_objetivo, alumno.examen_objetivo && alumno.examen_objetivo !== "ninguno" ? alumno.examen_objetivo : null]
              .filter(Boolean).join(" · ") || "—"} />
          <Field label="Curso" value={alumno.curso_display || "—"} />
          <Field label="Colegio de origen" value={alumno.colegio_origen || "—"} />
          <Field label="Idioma nativo" value={alumno.idioma_nativo || "—"} />
          <Field label="Contacto de emergencia"
            value={alumno.contacto_emergencia_nombre || alumno.contacto_emergencia_telefono
              ? `${alumno.contacto_emergencia_nombre} ${alumno.contacto_emergencia_telefono}`.trim()
              : "—"} />
        </div>
      </section>

      {/* Pagador */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Pagador
        </h2>
        {alumno.es_adulto ? (
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
            Se usa el propio alumno como pagador (nombre, teléfono y email indicados en Datos generales).
          </p>
        ) : (
          <>
            {pagador ? (
              <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
                <p style={{ fontWeight: 500, color: "var(--text)" }}>{pagador.nombre}</p>
                <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                  {[pagador.telefono, pagador.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>Sin pagador vinculado.</p>
            )}
            <PagadorCombobox theme="gold" value={alumno.pagador} onChange={pagadorId => pagadorMut.mutate(pagadorId)} />
            {pagador && (
              <div style={{ marginTop: "1rem" }}>
                <PagadorFieldsEditor theme="gold" value={pagadorDraft}
                  onChange={patch => setPagadorDraft(d => ({ ...d, ...patch }))}
                  onBlur={() => pagadorFieldsMut.mutate()} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Pagos */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Pagos</h2>
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

      {/* Facturas y recibos — read-only, distinct from "Documentos y consentimientos"
          below (which is consent forms: image rights/data protection/enrollment). */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Facturas y recibos
        </h2>
        {downloadDocError && (
          <p style={{ fontSize: "0.8rem", color: "var(--terracotta)", marginBottom: "0.75rem" }}>{downloadDocError}</p>
        )}
        {!documentos.length && <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Sin documentos generados.</p>}
        {!!documentos.length && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr>{["Nº doc", "Tipo", "Fecha de emisión", "Estado", ""].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {documentos.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{d.num_doc || d.nombre}</td>
                    <td>{DOC_TIPO_LABEL[d.tipo] ?? d.tipo}</td>
                    <td>{formatDocFecha(d.emitida_at)}</td>
                    <td>
                      <span className="badge" style={d.estado === "anulada" ? { background: "var(--terracotta-muted)", color: "var(--terracotta)" } : { background: "var(--sage-muted)", color: "var(--sage)" }}>
                        {d.estado}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                        disabled={downloadingDocId === d.id} onClick={() => handleDescargarDoc(d)}>
                        {downloadingDocId === d.id ? "..." : "Descargar"}
                      </button>
                      {d.drive_url && (
                        <a className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                          href={d.drive_url} target="_blank" rel="noopener noreferrer">
                          Ver en Drive
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Académico */}
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Académico</h2>
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
              {f.descripcion && <span style={{ fontSize: "1rem", color: "var(--text-dim)" }}>{f.descripcion}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text)" }}>Notas de progreso</p>
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
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
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
      <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
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
                  {TIPOS_CON_PDF.includes(tipo) && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}
                      disabled={imprimiendoTipo === tipo}
                      onClick={() => handleImprimirDocumento(tipo)}
                    >
                      {imprimiendoTipo === tipo ? "Generando…" : "Imprimir"}
                    </button>
                  )}
                </div>
                <span className="badge" style={firmado ? { background: "var(--sage-muted)", color: "var(--sage)" } : { background: "var(--terracotta-muted)", color: "var(--terracotta)" }}>
                  {firmado ? `Firmado${c?.fecha_firma ? " · " + formatDate(c.fecha_firma) : ""}` : "Pendiente"}
                </span>
              </div>
            )
          })}
        </div>
        {imprimirError && (
          <p style={{ fontSize: "0.8rem", color: "var(--terracotta)", marginTop: "0.6rem" }}>{imprimirError}</p>
        )}
      </section>

      {/* Salud — never rendered for reception */}
      {canSeeSalud && (
        <section className="card" style={{ padding: "1.1rem", marginBottom: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Salud</h2>
            <p style={{ fontSize: "1rem", color: "var(--text-dim)", fontStyle: "italic", marginTop: "0.25rem" }}>
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
      <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.2rem" }}>{label}</p>
      <p style={{ fontSize: "0.875rem", color: "var(--text)" }}>{value}</p>
    </div>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>{label}</p>
      <textarea rows={2} className="input" style={{ resize: "none" }} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function TextInput({ label, value, onChange, listId }: { label: string; value: string; onChange: (v: string) => void; listId?: string }) {
  return (
    <div>
      <p style={{ fontSize: "1rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>{label}</p>
      <input type="text" className="input" value={value} onChange={e => onChange(e.target.value)} list={listId} />
    </div>
  )
}
