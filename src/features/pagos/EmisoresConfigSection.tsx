import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emisoresApi, type Emisor } from "./api"

type EditableField = "nombre" | "autonoma" | "nif" | "direccion" | "ciudad" | "telefono" | "email" | "iban"
const FIELDS: { key: EditableField; label: string; placeholder?: string }[] = [
  { key: "nombre", label: "Nombre comercial" },
  { key: "autonoma", label: "Titular / razón social" },
  { key: "nif", label: "NIF / CIF" },
  { key: "direccion", label: "Dirección" },
  { key: "ciudad", label: "Ciudad / CP" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "iban", label: "IBAN" },
]

function EmisorCard({ emisor }: { emisor: Emisor }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<EditableField, string>>({
    nombre: emisor.nombre, autonoma: emisor.autonoma, nif: emisor.nif,
    direccion: emisor.direccion, ciudad: emisor.ciudad, telefono: emisor.telefono,
    email: emisor.email, iban: emisor.iban,
  })
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")

  // Resync if this Emisor's data changes elsewhere (another tab, or a refetch).
  useEffect(() => {
    setForm({
      nombre: emisor.nombre, autonoma: emisor.autonoma, nif: emisor.nif,
      direccion: emisor.direccion, ciudad: emisor.ciudad, telefono: emisor.telefono,
      email: emisor.email, iban: emisor.iban,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emisor.id, emisor.nombre, emisor.autonoma, emisor.nif, emisor.direccion, emisor.ciudad, emisor.telefono, emisor.email, emisor.iban])

  const saveMut = useMutation({
    mutationFn: () => emisoresApi.update(emisor.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emisores"] })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    },
    onError: () => { setSaveState("error"); setTimeout(() => setSaveState("idle"), 4000) },
  })

  const dirty = FIELDS.some(f => form[f.key] !== (emisor[f.key] ?? ""))

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-pine-900">{emisor.nombre}</p>
        <span className="text-[10px] font-bold uppercase tracking-wide text-pine-500 bg-khaki-100 px-2 py-0.5 rounded">
          Facturas {emisor.factura_prefix} · Recibos {emisor.recibo_prefix}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.key} className={f.key === "direccion" ? "sm:col-span-2" : undefined}>
            <label className="block text-xs font-semibold text-pine-700 mb-1">{f.label}</label>
            <input
              type="text"
              value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {saveState === "saved" && <span className="text-green-600 text-xs font-medium">✓ Guardado</span>}
        {saveState === "error" && <span className="text-red-600 text-xs">Error al guardar.</span>}
        <button
          onClick={() => { setSaveState("idle"); saveMut.mutate() }}
          disabled={!dirty || saveMut.isPending}
          className="px-4 py-1.5 rounded-lg bg-brass-500 text-white text-xs font-medium hover:bg-brass-700 disabled:opacity-50">
          {saveMut.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}

// Two brands, two separate legal/billing identities sharing one app — Cami&Co
// (Camila) and Rangers Academy (Candela). This is what invoice generation
// actually reads (see modules/documentos/invoice_service.py), unlike the old
// single "Datos de la academia" fields on the user profile, which real
// invoices never touched.
export default function EmisoresConfigSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["emisores"],
    queryFn: () => emisoresApi.list().then(r => r.data),
  })
  const emisores: Emisor[] = Array.isArray(data) ? data : []

  // reception is blocked server-side (403) — nothing to show her here, and
  // no error banner either, this section just quietly doesn't apply to her role.
  if (isError) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-pine-600">Datos de facturación</p>
        <p className="text-xs text-pine-600 mt-1">
          Un apartado por marca — cada una es una identidad fiscal distinta (NIF, dirección, numeración propia).
        </p>
      </div>
      {isLoading && <p className="text-xs text-pine-600">Cargando…</p>}
      {!isLoading && !emisores.length && (
        <p className="text-xs text-pine-600 italic">Sin emisores configurados todavía.</p>
      )}
      {emisores.map(e => <EmisorCard key={e.id} emisor={e} />)}
    </div>
  )
}
