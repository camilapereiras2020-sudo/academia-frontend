import { useState } from "react"
import { useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { whatsappReplyApi, type Situacion } from "../api"

const SITUACIONES: { value: Situacion; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "retraso", label: "Respondemos tarde" },
  { value: "cierre", label: "Encaminar a matrícula" },
]

export default function WhatsAppReplyPage() {
  const location = useLocation()
  const [incoming, setIncoming] = useState("")
  const [context, setContext] = useState(
    () => (location.state as { context?: string } | null)?.context ?? ""
  )
  const [situation, setSituation] = useState<Situacion>("normal")
  const [reply, setReply] = useState("")
  const [validationError, setValidationError] = useState("")
  const [copied, setCopied] = useState(false)

  const generarMut = useMutation({
    mutationFn: () =>
      whatsappReplyApi.generar({
        incoming: incoming.trim(),
        context: context.trim(),
        situation,
      }),
    onSuccess: (res) => setReply(res.data.reply),
  })

  const error =
    validationError ||
    (generarMut.isError
      ? (generarMut.error as any)?.response?.data?.error || "No se pudo conectar con el servidor. Probá de nuevo."
      : "")

  function handleGenerate() {
    if (!incoming.trim()) {
      setValidationError("Pega primero el mensaje recibido.")
      return
    }
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

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Respuestas WhatsApp</h1>
          <p className="page-subtitle">
            Generá un borrador de respuesta con el tono de Rangers Academy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card !bg-white p-6 space-y-4">
          <div>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
              Mensaje recibido
            </label>
            <textarea
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              placeholder="Pega el mensaje de WhatsApp aquí..."
              className="input !min-h-[120px] !py-2.5"
            />
          </div>

          <div>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-2">
              Situación
            </label>
            <div className="flex gap-2 flex-wrap">
              {SITUACIONES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSituation(s.value)}
                  className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
                    situation === s.value
                      ? "bg-pine-900 text-khaki-100 border-pine-900"
                      : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
              Contexto adicional (opcional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ej: horario disponible martes y jueves 11-12:30, es para B2..."
              className="input !min-h-[70px] !py-2.5"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generarMut.isPending}
            className="btn-primary w-full disabled:opacity-50"
          >
            {generarMut.isPending ? "Generando..." : "Generar respuesta"}
          </button>

          {error && <p className="text-red-700 text-[15px]">{error}</p>}
        </div>

        <div className="card !bg-white p-6">
          <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
            Respuesta sugerida
          </label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Aquí aparecerá la respuesta generada."
            className="input !min-h-[200px] !py-2.5"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!reply}
            className={`mt-3 w-full min-h-[44px] px-4 rounded-[10px] border text-[15px] font-semibold transition-colors ${
              copied
                ? "border-green-300 text-green-800 bg-green-50"
                : "border-pine-900/25 text-pine-900 hover:bg-khaki-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  )
}
