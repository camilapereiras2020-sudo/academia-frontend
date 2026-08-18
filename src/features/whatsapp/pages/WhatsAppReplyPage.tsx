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
          <h1 className="font-head font-normal text-3xl text-pine-900">Respuestas WhatsApp</h1>
          <p className="text-sm text-pine-700 mt-1">
            Generá un borrador de respuesta con el tono de Rangers Academy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">
              Mensaje recibido
            </label>
            <textarea
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              placeholder="Pega el mensaje de WhatsApp aquí..."
              className="w-full min-h-[120px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-2">
              Situación
            </label>
            <div className="flex gap-2 flex-wrap">
              {SITUACIONES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSituation(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    situation === s.value
                      ? "bg-brass-500 text-white border-brass-500"
                      : "bg-white text-pine-600 border-khaki-300 hover:border-brass-500"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">
              Contexto adicional (opcional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ej: horario disponible martes y jueves 11-12:30, es para B2..."
              className="w-full min-h-[70px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generarMut.isPending}
            className="w-full px-4 py-2.5 rounded-lg bg-brass-500 text-white text-sm font-medium hover:bg-brass-700 disabled:opacity-50"
          >
            {generarMut.isPending ? "Generando..." : "Generar respuesta"}
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <label className="block text-xs font-semibold text-pine-700 mb-1">
            Respuesta sugerida
          </label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Aquí aparecerá la respuesta generada."
            className="w-full min-h-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!reply}
            className={`mt-3 w-full px-4 py-2 rounded-lg border text-sm transition-colors ${
              copied
                ? "border-green-300 text-green-700 bg-green-50"
                : "border-khaki-300 text-pine-600 hover:border-brass-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  )
}
