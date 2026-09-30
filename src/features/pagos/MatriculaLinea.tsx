import {
  MATRICULA, matriculaCantidad, matriculaConcepto, matriculaDescuentoPct, matriculaDetalle, type ExtraLine,
} from "./matricula"

const CAMPO = "block font-label text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1"

// Línea editable de la matrícula: precio × cantidad = total sugerido; el
// total se puede cambiar y el % de descuento se calcula solo. Reglas y
// formato del concepto en ./matricula.
export default function MatriculaLinea({ value, onChange, onRemove }: {
  value: ExtraLine
  onChange: (next: ExtraLine) => void
  onRemove: () => void
}) {
  const cantidad = matriculaCantidad(value.concepto)
  const detalle = matriculaDetalle(value.concepto)
  const pct = matriculaDescuentoPct(value.importe, cantidad)

  function set(importe: number, cant: number, det: string) {
    onChange({ importe, concepto: matriculaConcepto(importe, cant, det) })
  }

  return (
    <div className="border border-pine-900/15 rounded-[10px] p-3 mb-2 bg-khaki-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[15px] font-semibold text-ink">Matrícula</span>
        <button type="button" onClick={onRemove} aria-label="Quitar matrícula"
          className="w-10 h-10 flex items-center justify-center rounded-[10px] text-red-700 hover:bg-red-50 text-[15px]">✕</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        <div>
          <span className={CAMPO}>Precio</span>
          <div className="input !bg-white/60 text-ink-soft flex items-center">{MATRICULA} €</div>
        </div>
        <div>
          <label className={CAMPO} htmlFor="matricula-cantidad">Cantidad</label>
          <input id="matricula-cantidad" type="number" min="1" step="1" value={cantidad}
            onChange={e => {
              const cant = Math.max(1, Math.floor(+e.target.value || 1))
              set(MATRICULA * cant, cant, detalle)
            }}
            className="input" />
        </div>
        <div>
          <label className={CAMPO} htmlFor="matricula-total">Total (€)</label>
          <input id="matricula-total" type="number" min="0" step="0.01" value={value.importe}
            onChange={e => set(+e.target.value, cantidad, detalle)}
            className="input" />
        </div>
        <div>
          <span className={CAMPO}>Descuento</span>
          <div className={`input flex items-center font-semibold ${pct > 0 ? "!bg-brass-300/40 text-brass-700" : "!bg-white/60 text-ink-soft"}`}
            aria-live="polite">
            {pct} %
          </div>
        </div>
      </div>
      <input type="text" placeholder="Detalle (opcional, sale en la factura)" aria-label="Detalle de la matrícula"
        value={detalle}
        onChange={e => set(value.importe, cantidad, e.target.value)}
        className="input" />
    </div>
  )
}
