import { useState } from "react"
import { createPortal } from "react-dom"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

interface Props {
  to: string            // display name or email shown in header
  onSend: (asunto: string, cuerpo: string) => Promise<void>
  onClose: () => void
}

export default function EmailModal({ to, onSend, onClose }: Props) {
  const overlayGuard = useOverlayMouseGuard(onClose)
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
    <div className="modal-overlay" {...overlayGuard}>
      <div className="modal !bg-white" style={{ maxWidth: "32rem", padding: 0 }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="font-head text-[22px] leading-tight text-pine-900">Enviar email</h2>
            <p className="text-[14px] text-ink-soft mt-1">Para: {to}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>✅</div>
            <p className="text-[15px] font-semibold text-ink">Email enviado correctamente.</p>
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
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Asunto</label>
              <input
                type="text" value={asunto} onChange={e => setAsunto(e.target.value)}
                placeholder="Ej: Recordatorio de pago — Junio 2026"
                className="input"
              />
            </div>
            <div>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Mensaje</label>
              <textarea
                rows={6} value={cuerpo} onChange={e => setCuerpo(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="input !py-2.5" style={{ resize: "none" }}
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
