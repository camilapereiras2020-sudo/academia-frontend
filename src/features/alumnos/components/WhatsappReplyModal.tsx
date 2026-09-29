import { useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "@tanstack/react-query"
import { whatsappReplyApi, type Situacion } from "@/features/whatsapp/api"
import type { Alumno } from "@/types"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

interface Props {
  alumno: Alumno
  pagadorNombre: string | null
  grupoNombre: string | null
  onClose: () => void
}

const SITUACIONES: { value: Situacion; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "retraso", label: "Respondemos tarde" },
  { value: "cierre", label: "Encaminar a matrícula" },
]

function buildContext(alumno: Alumno, pagadorNombre: string | null, grupoNombre: string | null): string {
  const lineas: string[] = [`Alumno: ${alumno.nombre}.`]
  if (grupoNombre) lineas.push(`Grupo: ${grupoNombre}.`)
  if (pagadorNombre) lineas.push(`Pagador: ${pagadorNombre}.`)
  if (alumno.nivel) lineas.push(`Nivel actual: ${alumno.nivel}.`)
  if (alumno.nivel_objetivo) lineas.push(`Nivel objetivo: ${alumno.nivel_objetivo}.`)
  return lineas.join(" ")
}

export default function WhatsappReplyModal({ alumno, pagadorNombre, grupoNombre, onClose }: Props) {
  const overlayGuard = useOverlayMouseGuard(onClose)
  const context = buildContext(alumno, pagadorNombre, grupoNombre)
  const [incoming, setIncoming] = useState("")
  const [situation, setSituation] = useState<Situacion>("normal")
  const [reply, setReply] = useState("")
  const [validationError, setValidationError] = useState("")
  const [copied, setCopied] = useState(false)

  const generarMut = useMutation({
    mutationFn: () => whatsappReplyApi.generar({ incoming: incoming.trim(), context, situation }),
    onSuccess: (res) => setReply(res.data.reply),
  })

  const error = validationError ||
    (generarMut.isError ? (generarMut.error as any)?.response?.data?.error || "No se pudo generar la respuesta." : "")

  function handleGenerate() {
    if (!incoming.trim()) { setValidationError("Pega primero el mensaje recibido."); return }
    setValidationError("")
    setReply("")
    generarMut.mutate()
  }

  function handleCopy() {
    if (!reply) return
    navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return createPortal(
    <div className="modal-overlay" {...overlayGuard}>
      <div className="modal !bg-white" style={{ maxWidth: "34rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 className="font-head text-[22px] leading-tight text-pine-900">Generar respuesta WhatsApp</h2>
          <button onClick={onClose} aria-label="Cerrar" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <p className="text-[14px] text-ink-soft bg-khaki-100 px-3.5 py-2.5 rounded-[10px]">
            Contexto: {context}
          </p>

          <div>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
              Mensaje recibido
            </label>
            <textarea
              rows={3} value={incoming} onChange={e => setIncoming(e.target.value)}
              placeholder="Pega el mensaje de WhatsApp aquí..."
              className="input !py-2.5 resize-none"
            />
          </div>

          <div>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
              Situación
            </label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {SITUACIONES.map(s => (
                <button key={s.value} type="button" onClick={() => setSituation(s.value)}
                  className={`min-h-[40px] px-3.5 rounded-full border font-label text-[14px] font-semibold transition-colors ${
                    situation === s.value
                      ? "bg-pine-900 border-pine-900 text-khaki-100"
                      : "bg-white border-pine-900/20 text-pine-700 hover:bg-khaki-100"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generarMut.isPending} className="btn-primary" style={{ width: "100%", opacity: generarMut.isPending ? 0.6 : 1 }}>
            {generarMut.isPending ? "Generando..." : "Generar respuesta"}
          </button>

          {error && <p className="text-[14px] text-red-700">{error}</p>}

          {reply && (
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
                Respuesta sugerida
              </label>
              <textarea rows={5} value={reply} onChange={e => setReply(e.target.value)} className="input !py-2.5 resize-none" />
              <button onClick={handleCopy} className="btn-ghost" style={{ marginTop: "0.5rem", width: "100%" }}>
                {copied ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
