import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { alumnosApi } from "../alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import PagadorCombobox from "@/features/pagadores/PagadorCombobox"
import PagadorFieldsEditor, { type PagadorDraft } from "@/features/pagadores/PagadorFieldsEditor"
import type { Alumno, Pagador, Marca } from "@/types"
import EmailModal from "@/components/shared/EmailModal"
import { useSetActiveBrand } from "@/store/useSetActiveBrand"
import { useAuthStore } from "@/store/authStore"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"
import { Phone, Mail, CreditCard, GraduationCap } from "lucide-react"

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const AVATAR_COLORS = [
  "bg-pine-900", "bg-brass-700", "bg-pine-600", "bg-rust-500",
  "bg-pine-700", "bg-pine-500",
]

// Station Desk UI tokens shared by the list, the form modal and the confirm.
const LABEL_CLS = "block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1"
const SECTION_CLS = "font-label text-[14px] font-semibold uppercase tracking-[0.12em] text-brass-700 mb-3"
const ACTION_BTN = "inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors"

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function age(fnac: string | null) {
  if (!fnac) return null
  const b = new Date(fnac), now = new Date()
  return now.getFullYear() - b.getFullYear() -
    (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

const emptyPagadorDraft = (): PagadorDraft => ({ telefono: "", email: "", direccion: "", nif: "" })

interface FormState {
  nombre: string; fnac: string; telefono: string; email: string; dni: string; notas: string
  marca: Marca | ""
  pagador: number | null; pagadorDraft: PagadorDraft
  es_adulto: boolean; aviso_cumple_dias: number | null
}

const emptyForm = (): FormState => ({
  nombre: "", fnac: "", telefono: "", email: "", dni: "", notas: "",
  marca: "",
  pagador: null, pagadorDraft: emptyPagadorDraft(),
  es_adulto: false, aviso_cumple_dias: null,
})

export default function AlumnosPage() {
  const isReception = useAuthStore((s) => s.user?.role === "reception")
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Alumno | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<Alumno | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [emailTarget, setEmailTarget] = useState<Alumno | null>(null)

  const { data: alumnosRaw, isLoading } = useQuery({
    queryKey: ["alumnos", search, marcaFilter],
    queryFn: () => alumnosApi.list({ search: search || undefined, marca: marcaFilter || undefined }).then(r => r.data),
  })
  const alumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : []

  useSetActiveBrand((showModal && form.marca) || marcaFilter || null)

  useEffect(() => {
    const openId = searchParams.get("openId")
    if (!openId || !alumnos.length) return
    const a = alumnos.find(x => x.id === Number(openId))
    if (a) openEdit(a)
    setSearchParams(params => { params.delete("openId"); return params }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, searchParams])

  const soloIncompletos = searchParams.get("incompletos") === "1"
  // Ex-alumnos (activo: false) are hidden by default — they're not deleted,
  // just kept out of the everyday list. This checkbox is the only way back
  // to them from here (or the "Reactivar" button on their own ficha).
  const [mostrarExAlumnos, setMostrarExAlumnos] = useState(false)
  const alumnosFiltrados = (soloIncompletos
    ? alumnos.filter(a => !a.telefono || !a.email)
    : alumnos
  ).filter(a => mostrarExAlumnos || a.activo !== false)

  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const pagadores: Pagador[] = Array.isArray(pagadoresRaw) ? pagadoresRaw : []


  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      // Minor with a linked/selected Pagador: persist any edits made in the
      // payer sub-section directly onto that Pagador. (Adult self-pay never
      // reaches here with f.pagador set — the checkbox clears it — and the
      // backend auto-creates/links that Pagador transparently.)
      if (!f.es_adulto && f.pagador) {
        await pagadoresApi.update(f.pagador, {
          telefono: f.pagadorDraft.telefono,
          email: f.pagadorDraft.email,
          direccion: f.pagadorDraft.direccion,
          nif: f.pagadorDraft.nif,
        })
      }
      const payload: Record<string, unknown> = {
        nombre: f.nombre, fnac: f.fnac || null, telefono: f.telefono,
        email: f.email, dni: f.dni, notas: f.notas, es_adulto: f.es_adulto,
        marca: f.marca as Marca,
        aviso_cumple_dias: f.aviso_cumple_dias,
      }
      // Adult self-pay: deliberately omit `pagador` — the backend auto-
      // creates/links one from the alumno's own contact data. Sending null
      // here would still work, but omitting it entirely keeps this request
      // from ever looking like it's clearing an existing link on update.
      if (!f.es_adulto) {
        payload.pagador = f.pagador
      }
      return editing
        ? await alumnosApi.update(editing.id, payload)
        : await alumnosApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      qc.invalidateQueries({ queryKey: ["pagadores"] })
      closeModal()
    },
    onError: () => setFormError("Error al guardar el alumno."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => alumnosApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumnos"] }); setConfirmDelete(null); setDeleteError("") },
    onError: (err: any) => setDeleteError(err.response?.data?.error ?? "Error al eliminar el alumno."),
  })

  function openNew() {
    setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true)
  }

  function openEdit(a: Alumno) {
    setEditing(a)
    const linkedPagador = pagadores.find(p => p.id === a.pagador) ?? null
    setForm({
      nombre: a.nombre, fnac: a.fnac ?? "", telefono: a.telefono ?? "",
      email: a.email ?? "", dni: a.dni ?? "", notas: a.notas ?? "",
      marca: a.marca,
      pagador: a.pagador ?? null,
      pagadorDraft: linkedPagador
        ? { telefono: linkedPagador.telefono, email: linkedPagador.email, direccion: linkedPagador.direccion, nif: linkedPagador.nif }
        : emptyPagadorDraft(),
      es_adulto: a.es_adulto ?? false, aviso_cumple_dias: a.aviso_cumple_dias ?? null,
    })
    setFormError(""); setShowModal(true)
  }

  function selectPagador(pagadorId: number | null) {
    const p = pagadorId != null ? pagadores.find(x => x.id === pagadorId) ?? null : null
    setForm(f => ({
      ...f,
      pagador: pagadorId,
      pagadorDraft: p
        ? { telefono: p.telefono, email: p.email, direccion: p.direccion, nif: p.nif }
        : emptyPagadorDraft(),
    }))
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm()) }
  const modalOverlayGuard = useOverlayMouseGuard(closeModal)

  function handleSubmit() {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return }
    if (!form.marca) { setFormError("Elige la marca/emisor antes de guardar."); return }
    if (!form.es_adulto && form.pagador && !form.pagadorDraft.nif.trim()) {
      setFormError("El DNI/NIF del pagador es obligatorio.")
      return
    }
    setFormError("")
    saveMut.mutate(form)
  }

  const pagadorNombre = (id: number | null) => pagadores.find(p => p.id === id)?.nombre ?? null
  const pagadorObj    = (id: number | null) => pagadores.find(p => p.id === id) ?? null

  function waUrl(pagTel: string, pagNombre: string, alumnoNombre: string) {
    const clean = pagTel.replace(/[\s\-().]/g, "")
    const phone = clean.startsWith("+") ? clean : `+34${clean}`
    const text  = encodeURIComponent(`Hola ${pagNombre}, te escribo sobre ${alumnoNombre}`)
    return `https://wa.me/${phone}?text=${text}`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Alumnos</h1>
          <p className="page-subtitle">{alumnosFiltrados.length} alumnos registrados</p>
        </div>
        {!isReception && (
          <button onClick={openNew} className="btn-primary">
            + Nuevo alumno
          </button>
        )}
      </div>

      {/* Search + brand filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text" placeholder="Buscar por nombre, email o teléfono..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="input !w-full md:!w-[360px]"
        />
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
        <label className="flex items-center gap-2 min-h-[44px] text-[15px] text-pine-700 cursor-pointer select-none">
          <input type="checkbox" className="w-5 h-5 accent-pine-900" checked={mostrarExAlumnos} onChange={e => setMostrarExAlumnos(e.target.checked)} />
          Mostrar ex-alumnos
        </label>
      </div>

      {soloIncompletos && (
        <div className="flex items-center gap-3 flex-wrap mb-4 text-[15px] bg-amber-50 text-amber-900 border border-amber-200 rounded-[10px] px-4 py-2">
          <span>Mostrando solo alumnos con teléfono o email incompleto.</span>
          <button
            onClick={() => setSearchParams(params => { params.delete("incompletos"); return params }, { replace: true })}
            className="min-h-[40px] font-semibold underline hover:no-underline"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {/* States */}
      {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}
      {!isLoading && !alumnosFiltrados.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <GraduationCap size={40} strokeWidth={1.5} className="text-brass-500 mb-3" />
          <p className="text-[15px]">
            {soloIncompletos ? "Ningún alumno con datos incompletos." : search ? "Sin resultados para esa búsqueda." : "Sin alumnos. Crea el primero."}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {alumnosFiltrados.map(a => {
          const color = AVATAR_COLORS[a.id % AVATAR_COLORS.length]
          const yearsOld = age(a.fnac)
          const pag = pagadorNombre(a.pagador)
          const pagObj_ = pagadorObj(a.pagador)
          const gruposDetalle = a.grupos_detalle ?? []
          return (
            <div key={a.id} onClick={() => navigate(`/alumnos/${a.id}`)}
              className="card !bg-white p-4 flex items-start gap-4 cursor-pointer hover:!border-brass-500">
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-khaki-100 text-[14px] font-bold flex-shrink-0 ${color}`}>
                {initials(a.nombre)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[16px] font-semibold text-ink">{a.nombre}</span>
                  {a.activo === false && (
                    <span className="badge bg-khaki-200 text-pine-700">
                      Ex-alumno
                    </span>
                  )}
                  {yearsOld !== null && (
                    <span className="text-[14px] text-ink-soft">{yearsOld} años</span>
                  )}
                  {a.fnac && (
                    <span className="text-[14px] text-ink-soft">{new Date(a.fnac).toLocaleDateString("es-ES")}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {a.telefono && (
                    <a href={`tel:${a.telefono}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-[14px] text-pine-700 hover:text-brass-700">
                      <Phone size={14} strokeWidth={2} className="text-brass-700" />{a.telefono}
                    </a>
                  )}
                  {a.email && (
                    <a href={`mailto:${a.email}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-[14px] text-pine-700 hover:text-brass-700">
                      <Mail size={14} strokeWidth={2} className="text-brass-700" />{a.email}
                    </a>
                  )}
                  {pag && (
                    <span className="inline-flex items-center gap-1.5 text-[14px] text-pine-700"><CreditCard size={14} strokeWidth={2} className="text-brass-700" />{pag}</span>
                  )}
                </div>

                {a.notas && (
                  <p className="text-[14px] text-ink-soft mt-1 italic truncate max-w-md">{a.notas}</p>
                )}

                {/* Group badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {gruposDetalle.map(g => (
                    <span key={g.grupo} className="inline-flex items-center gap-1 font-label text-[13px] font-semibold bg-khaki-100 text-pine-900 border border-pine-900/10 px-2.5 py-1 rounded-full">
                      {g.grupo_nombre}
                      {g.horarios.length > 0 && (
                        <span className="font-medium text-ink-soft">
                          · {g.horarios.map(h => DIAS[h.dia]?.slice(0, 3) + " " + h.ini).join(", ")}
                        </span>
                      )}
                    </span>
                  ))}
                  {!gruposDetalle.length && (
                    <span className="text-[14px] text-ink-soft italic">Sin grupo asignado</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0 max-w-[45%]" onClick={e => e.stopPropagation()}>
                {pagObj_?.telefono && (
                  <a
                    href={waUrl(pagObj_.telefono, pagObj_.nombre, a.nombre)}
                    target="_blank" rel="noreferrer"
                    className={`${ACTION_BTN} text-green-800 border-green-300 hover:bg-green-50`}>
                    WhatsApp
                  </a>
                )}
                {pagObj_?.email && (
                  <button onClick={() => setEmailTarget(a)}
                    className={`${ACTION_BTN} text-brass-700 border-brass-500/50 hover:bg-khaki-100`}>
                    Email
                  </button>
                )}
                <button onClick={() => openEdit(a)}
                  className={`${ACTION_BTN} text-pine-900 border-pine-900/25 hover:bg-khaki-100`}>
                  Editar
                </button>
                {!isReception && (
                  <button onClick={() => setConfirmDelete(a)} aria-label="Eliminar alumno" title="Eliminar alumno"
                    className={`${ACTION_BTN} text-red-700 border-red-200 hover:bg-red-50`}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showModal && createPortal(
        <div className="modal-overlay" {...modalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="pl-6 pr-3 py-3 border-b border-pine-900/10 flex items-center justify-between flex-shrink-0">
              <h2 className="font-head text-[22px] leading-tight text-pine-900">{editing ? "Editar alumno" : "Nuevo alumno"}</h2>
              <button onClick={closeModal} aria-label="Cerrar"
                className="w-11 h-11 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px]">{formError}</p>
              )}

              {/* Datos personales */}
              <section>
                <p className={SECTION_CLS}>Datos personales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Nombre *</label>
                    <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="input" />
                  </div>
                  {!isReception && (
                    <div>
                      <label className={LABEL_CLS}>Marca / Emisor *</label>
                      <select value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value as Marca }))}
                        className="input">
                        <option value="">Seleccionar...</option>
                        {MARCAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  )}
                  {!isReception && (
                    <div>
                      <label className={LABEL_CLS}>Fecha de nacimiento</label>
                      <input type="date" value={form.fnac} onChange={e => setForm(f => ({ ...f, fnac: e.target.value }))}
                        className="input" />
                    </div>
                  )}
                  {!isReception && (
                    <div>
                      <label className={LABEL_CLS}>Aviso cumpleaños (días antes)</label>
                      <input type="number" min="0" placeholder="14"
                        value={form.aviso_cumple_dias ?? ""}
                        onChange={e => setForm(f => ({ ...f, aviso_cumple_dias: e.target.value ? +e.target.value : null }))}
                        className="input" />
                    </div>
                  )}
                  <div>
                    <label className={LABEL_CLS}>Teléfono</label>
                    <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="input" />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input" />
                  </div>
                  {!isReception && (
                    <div>
                      <label className={LABEL_CLS}>DNI</label>
                      <input type="text" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                        className="input" />
                    </div>
                  )}
                  {!isReception && (
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Notas</label>
                      <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                        className="input !py-2.5 resize-none" />
                    </div>
                  )}
                </div>
              </section>

              {/* Pagador */}
              {!isReception && (
                <section>
                  <p className={SECTION_CLS}>Pagador</p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 min-h-[44px] text-[15px] text-pine-900 cursor-pointer">
                      <input type="checkbox" checked={form.es_adulto}
                        onChange={e => {
                          const checked = e.target.checked
                          setForm(f => ({ ...f, es_adulto: checked, pagador: null }))
                        }}
                        className="w-5 h-5 accent-pine-900" />
                      El alumno es adulto / paga el mismo
                    </label>
                    {form.es_adulto ? (
                      <p className="text-[14px] text-ink-soft">
                        Se usará el propio alumno como pagador (nombre, teléfono y email indicados arriba).
                      </p>
                    ) : (
                      <>
                        <PagadorCombobox value={form.pagador} onChange={selectPagador} />
                        {form.pagador && (
                          <PagadorFieldsEditor value={form.pagadorDraft}
                            onChange={patch => setForm(f => ({ ...f, pagadorDraft: { ...f.pagadorDraft, ...patch } }))} />
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}

            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-pine-900/10 flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal}
                className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="btn-primary disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear alumno"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {emailTarget && (
        <EmailModal
          to={pagadorObj(emailTarget.pagador)?.email ?? ""}
          onSend={(asunto, cuerpo) => alumnosApi.enviarEmail(emailTarget.id, asunto, cuerpo).then(() => {})}
          onClose={() => setEmailTarget(null)}
        />
      )}

      {confirmDelete && createPortal(
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-head text-[22px] leading-tight text-pine-900 mb-2">Eliminar alumno</h3>
            <p className="text-[15px] text-ink mb-1">
              ¿Eliminar a <strong>{confirmDelete.nombre}</strong>?
            </p>
            <p className="text-[14px] text-ink-soft mb-5">Esta acción no se puede deshacer.</p>
            {deleteError && <p className="text-red-700 text-[14px] mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setConfirmDelete(null); setDeleteError("") }}
                className="btn-ghost">
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                className="min-h-[44px] px-5 rounded-[10px] bg-red-700 text-white text-[15px] font-bold hover:bg-red-800 disabled:opacity-50">
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
