export interface Pagador {
  id: number; nombre: string; nif: string; telefono: string; email: string
  metodo: string; frecuencia: string; iban: string; notas: string
  fnac: string | null; aviso_cumple_dias: number | null; alumnos_count: number
}

export interface Grupo {
  id: number; nombre: string; nivel: string; tarifa: number; aula: string
  color_idx: number; horarios: { dia: number; ini: string; fin: string }[]; alumnos_count: number
}

export interface AlumnoGrupo {
  grupo: number; grupo_nombre: string; horarios: { dia: number; ini: string; fin: string }[]
}

export interface Alumno {
  id: number; nombre: string; fnac: string | null; telefono: string; email: string
  notas: string; aviso_cumple_dias: number | null; pagador: number | null
  grupos_detalle: AlumnoGrupo[]; created_at: string
}

export interface Pago {
  id: number; pagador: number; pagador_nombre: string; alumno: number; alumno_nombre: string
  grupo: number | null; grupo_nombre: string | null; periodo: string; mensualidad: number; descuento: number
  extras: { concepto: string; importe: number }[]; total: number; metodo: string
  estado: "pagado" | "pendiente" | "parcial"; fecha: string | null; notas: string
  num_doc: string; created_at: string
  tarifa?: number | null; tarifa_nombre?: string | null
}

export type TarifaNombre = "clase_grupo" | "bono_familia" | "clase_privada" | "clase_recuperada"
export type TarifaTipoCobro = "por_hora" | "mensual" | "bono_familiar"
export type TarifaMarca = "cami_and_co" | "rangers_academy"

export interface Tarifa {
  id: number
  nombre: TarifaNombre; nombre_display: string
  tipo_cobro: TarifaTipoCobro; tipo_cobro_display: string
  marca: TarifaMarca; marca_display: string
  precio: number
  horas_semanales: 1 | 2 | 3 | null
  created_at: string
}

export interface RegistroAsistencia {
  id: number; alumno: number; alumno_nombre: string
  estado: "present" | "absent" | "makeup" | "guest"; nota: string; es_invitado: boolean
}

export interface Sesion {
  id: number; grupo: number; grupo_nombre: string; fecha: string; hora: string | null
  notas: string; contenido: string; registros: RegistroAsistencia[]; created_at: string
}

export interface TareaCompletada {
  id: number; alumno: number; alumno_nombre: string
  estado: "pendiente" | "completada" | "parcial" | "no_entregada"; nota: string
}

export interface Tarea {
  id: number; grupo: number; grupo_nombre: string; sesion: number | null
  titulo: string; descripcion: string
  fecha_asignada: string; fecha_entrega: string
  completados: TareaCompletada[]; created_at: string
}

export interface NotaDificultad {
  id: number; grupo: number; grupo_nombre: string
  alumno: number; alumno_nombre: string
  tema: string; nota: string; fecha: string; sesion: number | null; created_at: string
}

export interface PaginatedResponse<T> {
  count: number; next: string | null; previous: string | null; results: T[]
}
