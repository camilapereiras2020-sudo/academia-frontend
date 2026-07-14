import { api } from "@/lib/axios"

export type Situacion = "normal" | "retraso" | "cierre"

export const whatsappReplyApi = {
  generar: (data: { incoming: string; context?: string; situation: Situacion }) =>
    api.post<{ reply: string }>("/whatsapp-reply/generar/", data),
}
