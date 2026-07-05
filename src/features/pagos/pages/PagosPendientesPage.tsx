import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi } from "../api"
import type { SugerenciaRow } from "../api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import { formatEur } from "@/lib/utils"
import type { Alumno, Pagador, Grupo, Marca } from "@/types"

const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

interface RowState {
  marca: Marca | ""
  alumno: number | ""
  pagador: number | ""
  grupo: number | ""
}

function suggestedState(row: SugerenciaRow): RowState {
  return {
    // marca isn't a "suggestion" from fuzzy matching — it's the pago's
    // already-stored value (correct for CSV imports, possibly wrong for a
    // manually-created draft that predates the required-marca fix). Shown
    // pre-filled for review, not forced blank, since there's already a
    // real value to show — but still changeable and still required.
    marca: row.pago.marca,
    alumno: row.sugerencia_alumno?.id ?? "",
    pagador: row.sugerencia_pagador?.id ?? "",
    grupo: row.sugerencia_grupo?.id ?? "",
  }
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 0.8
    ? "bg-green-100 text-green-800"
    : score >= 0.6
    ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-600"
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {Math.round(score * 100)}%
    </span>
  )
}

export default function PagosPendientesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  // Only holds fields the user has explicitly overridden — the displayed
  // value always falls back to the suggestion, computed at render time
  // (no effect needed to "sync" suggestions into state).
  const [overrides, setOverrides] = useState<Record<number, Partial<RowState>>>({})
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [rowError, setRowError] = useState<Record<number, string>>({})
  const [confirmBulk, setConfirmBulk] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["pagos-sugerencias"],
    queryFn: () => pagosApi.sugerencias().then(r => r.data),
  })
  const rows: SugerenciaRow[] = data ?? []

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const alumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as unknown as { results?: Alumno[] })?.results ?? []
  const pagadores: Pagador[] = Array.isArray(pagadoresRaw) ? pagadoresRaw : (pagadoresRaw as unknown as { results?: Pagador[] })?.results ?? []
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as unknown as { results?: Grupo[] })?.results ?? []

  function resolveRow(row: SugerenciaRow): RowState {
    return { ...suggestedState(row), ...overrides[row.pago.id] }
  }

  function setField<K extends keyof RowState>(pagoId: number, field: K, value: RowState[K]) {
    setOverrides(prev => ({ ...prev, [pagoId]: { ...prev[pagoId], [field]: value } }))
  }

  const saveMut = useMutation({
    mutationFn: ({ pagoId, state }: { pagoId: number; state: RowState }) =>
      pagosApi.update(pagoId, {
        marca: state.marca as Marca,
        alumno: state.alumno as number,
        pagador: state.pagador as number,
        grupo: state.grupo === "" ? null : (state.grupo as number),
      }),
    onSuccess: (_res, { pagoId }) => {
      setSavedIds(prev => new Set(prev).add(pagoId))
      setRowError(prev => ({ ...prev, [pagoId]: "" }))
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["pagos-sugerencias"] })
    },
    onError: (err: unknown, { pagoId }) => {
      const data = (err as { response?: { data?: { non_field_errors?: string[]; detail?: string } } })?.response?.data
      setRowError(prev => ({
        ...prev,
        [pagoId]: data?.non_field_errors?.[0] ?? data?.detail ?? "Error al guardar.",
      }))
    },
  })

  function canSave(state: RowState) {
    return state.marca !== "" && state.alumno !== "" && state.pagador !== ""
  }

  const pending = rows.filter(r => !savedIds.has(r.pago.id))
  const highConfidenceReady = pending.filter(r => {
    const state = resolveRow(r)
    return canSave(state) &&
      (r.sugerencia_alumno?.score ?? 0) >= 0.8 && (r.sugerencia_pagador?.score ?? 0) >= 0.8
  })

  async function handleBulkSaveHighConfidence() {
    setConfirmBulk(false)
    for (const row of highConfidenceReady) {
      await saveMut.mutateAsync({ pagoId: row.pago.id, state: resolveRow(row) })
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pagos pendientes de completar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pending.length} pago(s) importado(s) sin alumno/pagador asignado — se sugieren coincidencias a partir del concepto original de Bizum.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/pagos")} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
            ← Volver a Pagos
          </button>
          {highConfidenceReady.length > 0 && (
            <button
              onClick={() => setConfirmBulk(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              ✓ Confirmar {highConfidenceReady.length} de alta confianza (≥80%)
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm py-4">Cargando sugerencias...</p>}

      {!isLoading && !rows.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-4xl mb-3">✅</span>
          <p className="text-sm">No hay pagos pendientes de completar.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map(row => {
          const p = row.pago
          const saved = savedIds.has(p.id)
          const s = resolveRow(row)
          return (
            <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 ${saved ? "opacity-50" : ""}`}>
              {/* Identification header — read-only, this is how you tell rows apart */}
              <div className="bg-slate-50 border rounded-lg p-2.5 mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div><span className="text-slate-400">Fecha:</span> <span className="font-medium">{p.fecha}</span></div>
                <div><span className="text-slate-400">Importe:</span> <span className="font-semibold">{formatEur(Number(p.total))}</span></div>
                <div><span className="text-slate-400">Nº reservado:</span> <span className="font-mono text-xs">{p.numero_factura_reservado}</span></div>
                <div className="flex-1 min-w-[200px]">
                  <span className="text-slate-400">Concepto original:</span>{" "}
                  <span className="font-medium">{p.concepto_original || "—"}</span>
                </div>
              </div>

              {rowError[p.id] && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 p-2 rounded-lg mb-3">{rowError[p.id]}</p>
              )}

              <div className="mb-3 max-w-xs">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Marca / Emisor *</label>
                <select disabled={saved} value={s.marca}
                  onChange={e => setField(p.id, "marca", e.target.value as Marca)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                  <option value="">Seleccionar...</option>
                  {MARCAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                    Alumno *
                    {row.sugerencia_alumno && <ScoreBadge score={row.sugerencia_alumno.score} />}
                  </label>
                  <select disabled={saved} value={s.alumno}
                    onChange={e => setField(p.id, "alumno", e.target.value ? +e.target.value : "")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                    <option value="">Seleccionar...</option>
                    {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                    Pagador *
                    {row.sugerencia_pagador && <ScoreBadge score={row.sugerencia_pagador.score} />}
                  </label>
                  <select disabled={saved} value={s.pagador}
                    onChange={e => setField(p.id, "pagador", e.target.value ? +e.target.value : "")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                    <option value="">Seleccionar...</option>
                    {pagadores.map(pg => <option key={pg.id} value={pg.id}>{pg.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                    Grupo
                    {row.sugerencia_grupo && <ScoreBadge score={row.sugerencia_alumno?.score ?? 0} />}
                  </label>
                  <select disabled={saved} value={s.grupo}
                    onChange={e => setField(p.id, "grupo", e.target.value ? +e.target.value : "")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                    <option value="">Sin grupo</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-3">
                {saved ? (
                  <span className="text-xs font-semibold text-green-700">✓ Guardado</span>
                ) : (
                  <button
                    onClick={() => saveMut.mutate({ pagoId: p.id, state: s })}
                    disabled={!canSave(s) || (saveMut.isPending && saveMut.variables?.pagoId === p.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveMut.isPending && saveMut.variables?.pagoId === p.id ? "Guardando..." : "Guardar"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {confirmBulk && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Confirmar {highConfidenceReady.length} pagos</h3>
            <p className="text-sm text-slate-500 mb-4">
              Se asignará alumno/pagador/grupo y se generará la factura o recibo automáticamente para cada uno
              (usando su número ya reservado), igual que si los guardaras uno por uno. Solo incluye filas con
              sugerencia de alumno y pagador con confianza ≥80%. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmBulk(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleBulkSaveHighConfidence} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
