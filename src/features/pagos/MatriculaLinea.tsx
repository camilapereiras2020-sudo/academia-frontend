import { matriculaConcepto, matriculaDetalle, type ExtraLine } from "./matricula"

// Línea editable de la matrícula; reglas y formato del concepto en ./matricula.
export default function MatriculaLinea({ value, onChange, onRemove }: {
  value: ExtraLine
  onChange: (next: ExtraLine) => void
  onRemove: () => void
}) {
  const sinImporte = !(Number(value.importe) > 0)
  return (
    <div className="border border-pine-900/15 rounded-[10px] p-3 mb-2 bg-khaki-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[15px] font-semibold text-ink">Matrícula</span>
        <button type="button" onClick={onRemove} aria-label="Quitar matrícula"
          className="w-10 h-10 flex items-center justify-center rounded-[10px] text-red-700 hover:bg-red-50 text-[15px]">✕</button>
      </div>
      <div className="flex gap-2">
        <input type="number" min="0" step="0.01" placeholder="Importe €" aria-label="Importe de la matrícula"
          value={value.importe || ""}
          onChange={e => onChange({ ...value, importe: +e.target.value })}
          className={`input !w-32 ${sinImporte ? "!border-brass-500" : ""}`} />
        <input type="text" placeholder="Detalle (opcional)" aria-label="Detalle de la matrícula"
          value={matriculaDetalle(value.concepto)}
          onChange={e => onChange({ ...value, concepto: matriculaConcepto(e.target.value) })}
          className="input flex-1" />
      </div>
      {sinImporte && (
        <p className="text-[13px] text-brass-700 mt-1.5">Pon el importe de la matrícula, o quítala si no se cobra.</p>
      )}
    </div>
  )
}
