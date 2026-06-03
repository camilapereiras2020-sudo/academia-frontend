import { useState } from "react"

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Enviar email</h2>
            <p className="text-xs text-slate-400 mt-0.5">Para: {to}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-slate-700">Email enviado correctamente.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Asunto</label>
              <input
                type="text" value={asunto} onChange={e => setAsunto(e.target.value)}
                placeholder="Ej: Recordatorio de pago — Junio 2026"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mensaje</label>
              <textarea
                rows={6} value={cuerpo} onChange={e => setCuerpo(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {sending ? "Enviando..." : "Enviar ✉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
