// Horas de clase de un alumno en un mes, a partir de su horario (grupos y
// ventana personal) y de la asistencia marcada. Lo usa "Generar pago" de la
// ficha para rellenar horas_trabajadas y la línea del concepto de la factura.
import type { AlumnoGrupo, Sesion } from "@/types"

// Horario: dia 0 = lunes … 6 = domingo (JS getDay: 0 = domingo).
const jsDay = (dia: number) => (dia + 1) % 7

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + (m || 0)
}

interface Slot { grupo: number; dia: number; min: number }

/** Clases semanales del alumno (una por día de cada grupo), con su duración real. */
export function slotsSemanales(grupos: AlumnoGrupo[]): Slot[] {
  return grupos.flatMap(g => (g.horarios ?? []).map(h => {
    const ini = g.hora_inicio ?? h.ini
    const fin = g.hora_fin ?? h.fin
    return { grupo: g.grupo, dia: h.dia, min: Math.max(minutos(fin) - minutos(ini), 0) }
  }))
}

/** Número de veces que cae un día de la semana (formato horario) en el mes "AAAA-MM". */
function vecesEnMes(periodo: string, dia: number) {
  const [y, m] = periodo.split("-").map(Number)
  const dias = new Date(y, m, 0).getDate()
  let n = 0
  for (let d = 1; d <= dias; d++) if (new Date(y, m - 1, d).getDay() === jsDay(dia)) n++
  return n
}

export function horasPrevistas(slots: Slot[], periodo: string) {
  return slots.reduce((s, x) => s + vecesEnMes(periodo, x.dia) * x.min, 0) / 60
}

export interface Asistencia { fecha: string; grupo: number; min: number }

/** Sesiones del mes en las que el alumno vino (presente o recuperación). */
export function asistenciasDelMes(sesiones: Sesion[], alumnoId: number, slots: Slot[]): Asistencia[] {
  return sesiones
    .filter(s => s.registros.some(r => r.alumno === alumnoId && (r.estado === "present" || r.estado === "makeup")))
    .map(s => {
      const [y, m, d] = s.fecha.split("-").map(Number)
      const wd = new Date(y, m - 1, d).getDay()
      const slot = slots.find(x => x.grupo === s.grupo && jsDay(x.dia) === wd) ?? slots.find(x => x.grupo === s.grupo)
      return { fecha: s.fecha, grupo: s.grupo, min: slot?.min ?? 60 }
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function duracionTexto(min: number) {
  const h = Math.floor(min / 60), m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function horasTexto(h: number) {
  const r = Math.round(h * 10) / 10
  return `${String(r).replace(".", ",")} h`
}

/** "Clases de inglés — octubre 2026 (Cambridge FCE) · 2 clases/semana de 1 h 30 min · 12 h este mes" */
export function conceptoClases(periodo: string, grupoNombre: string | null, slots: Slot[], horas: number) {
  const [y, m] = periodo.split("-").map(Number)
  let txt = `Clases de inglés — ${MESES[m - 1]} ${y}`
  if (grupoNombre) txt += ` (${grupoNombre})`
  if (slots.length) {
    const durs = Array.from(new Set(slots.map(s => s.min)))
    txt += ` · ${slots.length} clase${slots.length === 1 ? "" : "s"}/semana`
    if (durs.length === 1) txt += ` de ${duracionTexto(durs[0])}`
  }
  if (horas > 0) txt += ` · ${horasTexto(horas)} este mes`
  return txt
}
