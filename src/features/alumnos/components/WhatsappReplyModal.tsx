import { useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "@tanstack/react-query"
import { whatsappReplyApi, type Situacion } from "@/features/whatsapp/api"
import type { Alumno } from "@/types"

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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: "34rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text)" }}>Generar respuesta WhatsApp</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "0.25rem 0.6rem" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", background: "var(--surface)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
            Contexto: {context}
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
              Mensaje recibido
            </label>
            <textarea
              rows={3} value={incoming} onChange={e => setIncoming(e.target.value)}
              placeholder="Pega el mensaje de WhatsApp aquí..."
              className="input" style={{ resize: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "var(--text-dim)", marginBottom: "0.4rem" }}>
              Situación
            </label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {SITUACIONES.map(s => (
                <button key={s.value} type="button" onClick={() => setSituation(s.value)}
                  className={situation === s.value ? "badge" : "btn-ghost"}
                  style={situation === s.value
                    ? { background: "var(--gold-muted)", color: "var(--gold)", border: "1px solid var(--border)", cursor: "pointer" }
                    : { fontSize: "0.7rem" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generarMut.isPending} className="btn-primary" style={{ width: "100%", opacity: generarMut.isPending ? 0.6 : 1 }}>
            {generarMut.isPending ? "Generando..." : "Generar respuesta"}
          </button>

          {error && <p style={{ fontSize: "0.8rem", color: "var(--terracotta)" }}>{error}</p>}

          {reply && (
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                Respuesta sugerida
              </label>
              <textarea rows={5} value={reply} onChange={e => setReply(e.target.value)} className="input" style={{ resize: "none" }} />
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
