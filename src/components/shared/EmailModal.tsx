import { useState } from "react"
import { createPortal } from "react-dom"

interface Props {
  to: string            // display name or email shown in header
  onSend: (asunto: string, cuerpo: string) => Promise<void>
  onClose: () => void
}

export default function EmailModal({ to, onSend, onClose }: Props) {
  const [asunto, setAsunto] = useState("")
  const [cuerpo, setCuerpo] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSend() {
    if (!asunto.trim() || !cuerpo.trim()) { setError("Asunto y mensaje son obligatorios."); return }
    setSending(true); setError("")
    try {
      await onSend(asunto, cuerpo)
      setDone(true)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Error al enviar el email.")
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: "32rem", padding: 0 }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text)" }}>Enviar email</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>Para: {to}</p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "1rem" }}>✕</button>
        </div>

        {done ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>✅</div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>Email enviado correctamente.</p>
            <button onClick={onClose} className="btn-ghost" style={{ marginTop: "1rem" }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && (
              <p style={{ fontSize: "0.875rem", color: "#b5654a", background: "var(--terracotta-muted)", border: "1px solid var(--border-subtle)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>{error}</p>
            )}
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "var(--text-dim)", marginBottom: "0.35rem" }}>Asunto</label>
              <input
                type="text" value={asunto} onChange={e => setAsunto(e.target.value)}
                placeholder="Ej: Recordatorio de pago — Junio 2026"
                className="input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "var(--text-dim)", marginBottom: "0.35rem" }}>Mensaje</label>
              <textarea
                rows={6} value={cuerpo} onChange={e => setCuerpo(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="input" style={{ resize: "none" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.25rem" }}>
              <button onClick={onClose} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending} className="btn-primary" style={{ opacity: sending ? 0.5 : 1 }}>
                {sending ? "Enviando..." : "Enviar ✉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
