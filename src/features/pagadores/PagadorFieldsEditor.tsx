export interface PagadorDraft {
  telefono: string
  email: string
  direccion: string
  nif: string
}

interface Props {
  value: PagadorDraft
  onChange: (patch: Partial<PagadorDraft>) => void
  /** "tailwind" matches AlumnosPage's raw-Tailwind modal (default). "gold" matches the
   * .card/.input gold-dark system used by AlumnoDetailPage/DashboardPage. */
  theme?: "tailwind" | "gold"
  /** Fires on blur of any field — used by callers that want to persist immediately
   * (e.g. AlumnoDetailPage's inline-PATCH pattern) instead of waiting for a form submit. */
  onBlur?: () => void
}

/** Shared editable field set for a Pagador's contact/tax info — used by both
 * AlumnosPage's create/edit modal and AlumnoDetailPage's inline editing, so the
 * "who pays" sub-section behaves identically on both surfaces. Purely
 * presentational/controlled: callers own persistence (create/update/PATCH). */
export default function PagadorFieldsEditor({ value, onChange, theme = "tailwind", onBlur }: Props) {
  const gold = theme === "gold"
  const inputCls = gold ? "input" : "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
  const labelCls = gold
    ? undefined
    : "block text-xs font-semibold text-pine-700 mb-1"
  const labelStyle = gold ? { fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.35rem", display: "block" } : undefined

  return (
    <div className={gold ? undefined : "grid grid-cols-1 sm:grid-cols-2 gap-3"}
      style={gold ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" } : undefined}>
      <div>
        <label className={labelCls} style={labelStyle}>Teléfono</label>
        <input type="tel" className={inputCls} value={value.telefono} onBlur={onBlur}
          onChange={e => onChange({ telefono: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Email</label>
        <input type="email" className={inputCls} value={value.email} onBlur={onBlur}
          onChange={e => onChange({ email: e.target.value })} />
      </div>
      <div style={gold ? { gridColumn: "1 / -1" } : undefined} className={gold ? undefined : "sm:col-span-2"}>
        <label className={labelCls} style={labelStyle}>Dirección</label>
        <input type="text" className={inputCls} value={value.direccion} onBlur={onBlur}
          onChange={e => onChange({ direccion: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>DNI/NIF *</label>
        <input type="text" className={inputCls} value={value.nif} onBlur={onBlur}
          onChange={e => onChange({ nif: e.target.value })} />
      </div>
    </div>
  )
}
