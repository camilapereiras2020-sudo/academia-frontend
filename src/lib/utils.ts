import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatEur = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })

export const formatMonth = (periodo: string) => {
  const [y, m] = periodo.split("-")
  return new Date(+y, +m - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}

export const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
