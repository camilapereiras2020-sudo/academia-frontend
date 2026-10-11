import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { gruposApi } from "../api"
import { DIAS, PALETTE, suggestUniqueGrupoName } from "../palette"
import type { CategoriaNivel, Grupo } from "@/types"
import { useAuthStore } from "@/store/authStore"
import { NivelSelect } from "@/features/niveles/NivelSelect"
import { nivelesApi } from "@/features/niveles/api"
import { CATEGORIA_LABELS, CATEGORIA_ORDEN } from "@/features/niveles/categorias"
import { ProfesorSelect } from "@/features/profesores/ProfesorSelect"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

interface HorarioSlot { dia: number; ini: string; fin: string }
interface GrupoForm {
  nombre: string; nivel: string; profesor: number | null; tarifa: number
  aula: string; color_idx: number; horarios: HorarioSlot[]
}

const SIN_PROFE = "_sin_"   // valor de ?profe= para "grupos sin profesora"
const SIN_NIVEL = "sin"      // valor de ?edad= para "grupos sin nivel o con un nivel que no se reconoce"
type EdadFiltro = "" | CategoriaNivel | typeof SIN_NIVEL
const EDAD_VALIDAS: string[] = [...CATEGORIA_ORDEN, SIN_NIVEL]

// Un mismo nivel se escribe de varias formas ("a1", "A1 ") y los exámenes de
// Cambridge equivalen a un nivel: PET = B1, FCE = B2, CAE = C1. Se comparan por
// esta clave, tanto el nombre del Nivel como el texto de Grupo.nivel.
const NIVEL_EQUIVALENTE: Record<string, string> = { pet: "b1", fce: "b2", cae: "c1" }
const claveNivel = (s?: string | null) => {
  const k = (s ?? "").trim().toLowerCase()
  return NIVEL_EQUIVALENTE[k] ?? k
}

const emptyForm = (nextColorIdx = 0): GrupoForm => ({
  nombre: "", nivel: "", profesor: null, tarifa: 0, aula: "", color_idx: nextColorIdx, horarios: [],
})

export default function GruposPage() {
  const isReception = useAuthStore((s) => s.user?.role === "reception")
  const qc = useQueryClient()
  const navigate = useNavigate()
  // Los filtros viven en la URL (?q=&profe=&edad=&dias=0,2): al abrir un grupo y
  // volver atrás se conservan, y el enlace se puede compartir. Se cambian con
  // replace para no llenar el historial a cada tecla.
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const profesorFiltro = params.get("profe") ?? ""          // "" = todas, SIN_PROFE = sin profesora
  const edadParam = params.get("edad") ?? ""
  const edadFiltro: EdadFiltro = EDAD_VALIDAS.includes(edadParam) ? (edadParam as EdadFiltro) : ""
  const diasParam = params.get("dias") ?? ""
  const diasFiltro = useMemo(                               // vacío = cualquier día
    () => diasParam.split(",").filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < DIAS.length),
    [diasParam],
  )
  function setFiltro(key: "q" | "profe" | "edad" | "dias", value: string) {
    // Se parte de la URL real (no de la foto del último render) para que dos
    // cambios seguidos no se pisen el uno al otro.
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Grupo | null>(null)
  const [form, setForm] = useState<GrupoForm>(emptyForm())
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<Grupo | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [nameAutoAdjusted, setNameAutoAdjusted] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const all: Grupo[] = Array.isArray(data) ? data : []

  // Grupo.nivel es un texto; la edad (categoría) vive en Nivel. Misma queryKey y
  // misma forma que NivelSelect, para compartir caché.
  const { data: nivelesData, isLoading: nivelesCargando, isError: nivelesError, refetch: recargarNiveles } = useQuery({
    queryKey: ["niveles", "activos"],
    queryFn: () => nivelesApi.list({ activo: true }),
  })
  const categoriaDeNivel = useMemo(
    () => new Map((nivelesData?.data ?? []).map(n => [claveNivel(n.nombre), n.categoria])),
    [nivelesData],
  )
  const profesores = useMemo(() => {
    const set = new Set(all.map(g => g.profesor_nombre).filter((n): n is string => !!n))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [all])

  // Buscador + profesora + días + edad se combinan (todos tienen que cumplirse).
  // Días: el grupo pasa si tiene clase en alguno de los días marcados.
  // Edad: se cruza el nivel con su categoría (ver claveNivel); un grupo sin nivel,
  // o con un nivel desactivado o desconocido, no aparece en Kids/Teens/Adults:
  // se encuentra con "Sin nivel o no reconocido".
  const grupos = all
    .filter(g => !search || g.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (g.nivel ?? "").toLowerCase().includes(search.toLowerCase()))
    .filter(g => !profesorFiltro || (profesorFiltro === SIN_PROFE ? !g.profesor_nombre : g.profesor_nombre === profesorFiltro))
    .filter(g => !diasFiltro.length || (Array.isArray(g.horarios) ? g.horarios : []).some(h => diasFiltro.includes(h?.dia)))
    .filter(g => {
      if (!edadFiltro) return true
      const categoria = categoriaDeNivel.get(claveNivel(g.nivel))
      return edadFiltro === SIN_NIVEL ? !categoria : categoria === edadFiltro
    })
  const hayFiltros = !!(search || profesorFiltro || diasFiltro.length || edadFiltro)
  // Sin los niveles no se puede filtrar por edad: mejor decirlo que enseñar un
  // "no hay grupos" falso (mientras cargan, o si la petición falla).
  const edadNoDisponible = !!edadFiltro && (nivelesCargando || nivelesError)

  function toggleDia(d: number) {
    const nuevos = diasFiltro.includes(d) ? diasFiltro.filter(x => x !== d) : [...diasFiltro, d]
    setFiltro("dias", nuevos.sort((a, b) => a - b).join(","))
  }

  const saveMut = useMutation({
    mutationFn: (d: GrupoForm) => editing ? gruposApi.update(editing.id, d) : gruposApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos"] }); closeModal() },
    onError: () => setFormError("Error al guardar el grupo."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => gruposApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos"] }); setConfirmDelete(null); setDeleteError("") },
    onError: (err: any) => setDeleteError(err.response?.data?.error ?? "Error al eliminar el grupo."),
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm(grupos.length % PALETTE.length))
    setFormError("")
    setNameAutoAdjusted(false)
    setShowModal(true)
  }

  function openEdit(g: Grupo) {
    setEditing(g)
    setForm({
      nombre: g.nombre, nivel: g.nivel ?? "", profesor: g.profesor ?? null, tarifa: g.tarifa,
      aula: g.aula ?? "", color_idx: g.color_idx ?? 0,
      horarios: g.horarios ?? [],
    })
    setFormError("")
    setNameAutoAdjusted(false)
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null) }
  const modalOverlayGuard = useOverlayMouseGuard(closeModal)

  // Fires when the nombre field loses focus (not on every keystroke, so
  // typing isn't interrupted mid-word) — if what's there matches an existing
  // grupo's name, append that grupo's own day+time to make this one tell
  // apart from it. Only kicks in once at least one horario is set; with none
  // yet there's nothing to disambiguate with, so the name is left alone.
  function handleNombreBlur() {
    const suggested = suggestUniqueGrupoName(
      form.nombre, all, form.horarios[0]?.dia, form.horarios[0]?.ini, editing?.id
    )
    if (suggested !== form.nombre.trim()) {
      setForm(f => ({ ...f, nombre: suggested }))
      setNameAutoAdjusted(true)
    }
  }

  function addHorario() {
    setForm(f => ({ ...f, horarios: [...f.horarios, { dia: 0, ini: "09:00", fin: "10:00" }] }))
  }

  function removeHorario(idx: number) {
    setForm(f => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }))
  }

  function updateHorario(idx: number, field: string, value: string | number) {
    setForm(f => {
      const h = [...f.horarios]
      h[idx] = { ...h[idx], [field]: value }
      return { ...f, horarios: h }
    })
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return }
    // Belt-and-suspenders for the case the onBlur suggestion couldn't fire
    // (ej. pegó el nombre y le dio a "Crear grupo" sin pasar por otro campo)
    // — sin horario no hay con qué armar un sufijo, así que frenamos en vez
    // de dejar pasar otra clase indistinguible de una ya existente.
    const clash = all.some(g => g.id !== editing?.id && g.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())
    if (clash) {
      setFormError("Ya existe una clase con ese nombre. Añadí un horario (para diferenciarla automáticamente) o cambiá el nombre.")
      return
    }
    setFormError("")
    saveMut.mutate(form)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Grupos</h1>
          <p className="page-subtitle">
            {hayFiltros ? `${grupos.length} de ${all.length} grupos` : `${all.length} grupos activos`}
          </p>
        </div>
        {!isReception && (
          <button onClick={openNew}
            className="btn-primary inline-flex items-center gap-2">
            + Nuevo grupo
          </button>
        )}
      </div>

      {/* Filtros: buscador, profesora, edad y días */}
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <input type="text" placeholder="Buscar por nombre o nivel…" value={search}
          onChange={e => setFiltro("q", e.target.value)}
          className="input !w-full md:!w-[320px]" />
        <div>
          <label htmlFor="grupos-profesor" className="block font-label text-[14px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
            Profesora
          </label>
          <select id="grupos-profesor" value={profesorFiltro} onChange={e => setFiltro("profe", e.target.value)}
            className="input min-w-[220px]">
            <option value="">Todas</option>
            {profesores.map(p => <option key={p} value={p}>{p}</option>)}
            <option value={SIN_PROFE}>Sin profesora</option>
          </select>
        </div>
        <div>
          <label htmlFor="grupos-edad" className="block font-label text-[14px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
            Edad
          </label>
          <select id="grupos-edad" value={edadFiltro} onChange={e => setFiltro("edad", e.target.value)}
            disabled={nivelesError}
            className="input min-w-[180px]">
            <option value="">Todas las edades</option>
            {CATEGORIA_ORDEN.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
            <option value={SIN_NIVEL}>Sin nivel o no reconocido</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap items-center mb-5">
        <span className="font-label text-[14px] font-semibold uppercase tracking-[0.08em] text-pine-700 mr-1">Días</span>
        {DIAS.map((d, i) => {
          const on = diasFiltro.includes(i)
          return (
            <button key={d} type="button" onClick={() => toggleDia(i)} aria-pressed={on}
              className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
                on ? "bg-pine-900 text-khaki-100 border-pine-900" : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
              }`}>
              {d}
            </button>
          )
        })}
        {hayFiltros && (
          <button type="button" onClick={() => setParams({}, { replace: true })}
            className="min-h-[40px] px-3 font-label text-[14px] font-semibold text-brass-700 hover:text-pine-900">
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}

      {edadNoDisponible && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft gap-3">
          {nivelesError ? (
            <>
              <p className="text-[15px] text-red-700">No se pudieron cargar los niveles, así que no se puede filtrar por edad.</p>
              <button type="button" onClick={() => recargarNiveles()} className="btn-ghost">Reintentar</button>
            </>
          ) : (
            <p className="text-[15px]">Cargando niveles…</p>
          )}
        </div>
      )}

      {!isLoading && !edadNoDisponible && !grupos.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <p className="text-[15px]">{hayFiltros ? "Sin grupos con esos filtros." : "Sin grupos. Crea el primero."}</p>
        </div>
      )}

      {/* Group cards */}
      <div className="space-y-3">
        {!edadNoDisponible && grupos.map(g => {
          const c = PALETTE[g.color_idx % PALETTE.length]
          const horarios = g.horarios ?? []
          return (
            <div key={g.id} className="card !bg-white overflow-hidden">
              {/* Card row */}
              <div className="flex items-stretch">
                {/* Color accent bar */}
                <div className="w-1.5 flex-shrink-0" style={{ background: c.accent }} />

                <div className="flex-1 p-4 flex items-center justify-between flex-wrap gap-3
                  cursor-pointer hover:bg-khaki-100 transition-colors"
                  onClick={() => navigate(`/grupos/${g.id}`)}>
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="text-[16px] font-semibold text-ink">{g.nombre}</span>
                    {g.nivel && (
                      <span className="font-label text-[13px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                        {g.nivel}
                      </span>
                    )}
                    <span className="font-label text-[14px] font-medium text-ink-soft">👥 {g.alumnos_count} alumnos</span>
                    {g.aula && <span className="font-label text-[14px] font-medium text-ink-soft">📍 {g.aula}</span>}
                    {g.profesor_nombre && <span className="font-label text-[14px] font-medium text-ink-soft">🧑‍🏫 {g.profesor_nombre}</span>}
                    {g.tarifa > 0 && (
                      <span className="font-label text-[14px] font-semibold text-pine-900">
                        {Number(g.tarifa).toFixed(2)} €/mes
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Schedule chips (quick peek) */}
                    {horarios.length > 0 && (
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {horarios.map((h, i) => (
                          <span key={i} className="font-label text-[13px] font-medium px-2.5 py-1 rounded-full"
                            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                            {DIAS[h.dia]?.slice(0, 3)} {h.ini}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isReception && (
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(g)}
                          className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold border-pine-900/25 text-pine-900 hover:bg-khaki-100">
                          Editar
                        </button>
                        <button onClick={() => setConfirmDelete(g)}
                          aria-label="Eliminar grupo" title="Eliminar grupo"
                          className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold min-w-[40px] border-red-200 text-red-700 hover:bg-red-50">
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="modal-overlay"
          {...modalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="pl-6 pr-3 py-3 border-b border-pine-900/10 flex items-center justify-between flex-shrink-0">
              <h2 className="font-head text-[22px] leading-tight text-pine-900">{editing ? "Editar grupo" : "Nuevo grupo"}</h2>
              <button onClick={closeModal} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px]">{formError}</p>
              )}

              <div>
                <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Nombre *</label>
                <input type="text" value={form.nombre} placeholder="Ej: B1 Martes tarde"
                  onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setNameAutoAdjusted(false) }}
                  onBlur={handleNombreBlur}
                  className="input" />
                {nameAutoAdjusted && (
                  <p className="text-[14px] text-brass-700 mt-1">
                    Ya existe una clase con ese nombre — se agregó el horario para diferenciarla. Podés cambiarlo si querés otro nombre.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Nivel</label>
                  <NivelSelect value={form.nivel} onChange={v => setForm(f => ({ ...f, nivel: v }))}
                    className="input" />
                </div>
                <div>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Tarifa mensual (€)</label>
                  <input type="number" value={form.tarifa} min="0" step="0.01"
                    onChange={e => setForm(f => ({ ...f, tarifa: +e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Aula</label>
                  <input type="text" value={form.aula} placeholder="Aula 1, Online…"
                    onChange={e => setForm(f => ({ ...f, aula: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Profesor/a</label>
                  <ProfesorSelect value={form.profesor} onChange={v => setForm(f => ({ ...f, profesor: v }))}
                    className="input" />
                </div>
                <div>
                  <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {PALETTE.map((c, i) => (
                      <button key={i} onClick={() => setForm(f => ({ ...f, color_idx: i }))}
                        title={`Color ${i + 1}`}
                        className="w-10 h-10 rounded-full transition-transform hover:scale-110 focus:outline-none"
                        style={{
                          background: c.bg,
                          border: `3px solid ${form.color_idx === i ? c.accent : c.border}`,
                          boxShadow: form.color_idx === i ? `0 0 0 2px ${c.accent}40` : "none",
                        }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700">Horario base</label>
                  <button onClick={addHorario} className="min-h-[40px] px-1 font-label text-[14px] font-semibold text-brass-700 hover:text-pine-900">
                    + Añadir franja
                  </button>
                </div>
                {!form.horarios.length && (
                  <p className="text-[14px] text-ink-soft italic">Sin franjas. Pulsa + Añadir franja.</p>
                )}
                <div className="space-y-2">
                  {form.horarios.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <select value={h.dia} onChange={e => updateHorario(idx, "dia", +e.target.value)}
                        onBlur={idx === 0 ? handleNombreBlur : undefined}
                        className="input !w-auto">
                        {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <input type="time" value={h.ini} onChange={e => updateHorario(idx, "ini", e.target.value)}
                        onBlur={idx === 0 ? handleNombreBlur : undefined}
                        className="input !w-36" />
                      <span className="text-[15px] text-ink-soft">→</span>
                      <input type="time" value={h.fin} onChange={e => updateHorario(idx, "fin", e.target.value)}
                        className="input !w-36" />
                      <button onClick={() => removeHorario(idx)}
                        className="w-10 h-10 flex items-center justify-center rounded-[10px] text-red-700 hover:bg-red-50 text-[15px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color preview */}
              {form.nombre && (
                <div className="rounded-[10px] p-3 border text-[15px] font-medium"
                  style={{
                    background: PALETTE[form.color_idx]?.bg,
                    color: PALETTE[form.color_idx]?.text,
                    borderColor: PALETTE[form.color_idx]?.border,
                  }}>
                  Vista previa: {form.nombre}
                  {form.nivel && <span className="ml-2 opacity-70 text-[13px]">{form.nivel}</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-pine-900/10 flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal}
                className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="btn-primary disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear grupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-head text-[22px] leading-tight text-pine-900 mb-2">Eliminar grupo</h3>
            <p className="text-[15px] text-ink mb-1">
              ¿Eliminar <strong>{confirmDelete.nombre}</strong>?
            </p>
            <p className="text-[14px] text-ink-soft mb-4">
              Los alumnos del grupo no se eliminarán, pero perderán la asignación.
            </p>
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
        </div>
      )}
    </div>
  )
}
