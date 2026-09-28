// Tarifa oficial Rangers Academy 2026/2027 — la misma que reciben las
// familias en los PDF de precios (90 min: "Tarifa-Rangers-26-27.pdf").
// Única fuente para la guía de /precios y la calculadora de cobros. Si cambia
// un precio, cambia primero en el PDF y después aquí y en
// academia-api modules/tarifas/pricing.py (sus tests fijan las mismas cifras).

export type Duracion = 60 | 90

export interface Tramo { dias: number; precio: number; horas: string }

// Clases Grupo, precio por alumno y mes. 90 min solo de 1 a 3 días.
export const CLASES_GRUPO: Record<Duracion, Tramo[]> = {
  60: [
    { dias: 1, precio: 50, horas: "1h" },
    { dias: 2, precio: 95, horas: "2h" },
    { dias: 3, precio: 145, horas: "3h" },
    { dias: 4, precio: 185, horas: "4h" },
    { dias: 5, precio: 230, horas: "5h" },
  ],
  90: [
    { dias: 1, precio: 75, horas: "1h30" },
    { dias: 2, precio: 137, horas: "3h" },
    { dias: 3, precio: 200, horas: "4h30" },
  ],
}

// Bono Familia: precio conjunto por mes para 2 hermanos que van los mismos
// días y la misma duración. Otros casos se calculan a mano.
export const BONO_FAMILIA: Record<Duracion, Tramo[]> = {
  60: [
    { dias: 1, precio: 95, horas: "1h" },
    { dias: 2, precio: 180, horas: "2h" },
    { dias: 3, precio: 275, horas: "3h" },
    { dias: 4, precio: 350, horas: "4h" },
    { dias: 5, precio: 435, horas: "5h" },
  ],
  90: [
    { dias: 1, precio: 130, horas: "1h30" },
    { dias: 2, precio: 260, horas: "3h" },
    { dias: 3, precio: 375, horas: "4h30" },
  ],
}

export const MATRICULA = 20
export const PRECIO_PRIVADA_HORA = 30
export const PRECIO_PRIVADA_PROFESIONAL_HORA = 35

export function euros(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 === 0 ? 0 : 2 }) + " €"
}
