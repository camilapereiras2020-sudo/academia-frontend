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

export type Marca = "cami_and_co" | "rangers_academy"

export type NivelObjetivo = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type ExamenObjetivo = "KET" | "PET" | "FCE" | "CAE" | "CPE" | "ninguno"

export interface Alumno {
  id: number; nombre: string; marca: Marca; marca_display?: string
  fnac: string | null; telefono: string; email: string; dni: string; nivel: string
  notas: string; aviso_cumple_dias: number | null; pagador: number | null
  grupos_detalle: AlumnoGrupo[]; created_at: string
  foto_url: string
  nivel_objetivo: NivelObjetivo | ""
  examen_objetivo: ExamenObjetivo | ""
  colegio_origen: string
  idioma_nativo: string
  contacto_emergencia_nombre: string
  contacto_emergencia_telefono: string
}

export type TipoFechaImportante = "examen" | "revision_nivel" | "inicio_curso" | "fin_curso" | "otro"

export interface FechaImportante {
  id: number; alumno: number; fecha: string
  tipo: TipoFechaImportante; tipo_display: string; descripcion: string
}

export type TipoNotaAlumno = "progreso" | "reunion" | "general"

export interface NotaAlumno {
  id: number; alumno: number; autor: number | null; autor_nombre: string
  fecha: string; contenido: string; tipo: TipoNotaAlumno; tipo_display: string
}

export interface DatoSalud {
  id: number; alumno: number
  alergias: string; condiciones_medicas: string; medicacion: string
}

export type TipoConsentimiento = "autorizacion_imagen" | "proteccion_datos" | "matricula"

export interface ConsentimientoAlumno {
  id: number; alumno: number
  tipo: TipoConsentimiento; tipo_display: string
  firmado: boolean; fecha_firma: string | null; documento_url: string
}

export interface AlumnoResumen {
  pagos: Pago[]
  fechas_importantes: FechaImportante[]
  notas: NotaAlumno[]
}

export interface Pago {
  id: number; marca: Marca; marca_display?: string
  pagador: number | null; pagador_nombre: string | null; alumno: number | null; alumno_nombre: string | null
  grupo: number | null; grupo_nombre: string | null; periodo: string; mensualidad: number; descuento: number
  extras: { concepto: string; importe: number }[]; total: number; metodo: string
  estado: "pagado" | "pendiente" | "parcial"; fecha: string | null; notas: string
  num_doc: string; created_at: string
  tarifa?: number | null; tarifa_nombre?: string | null
  horas_trabajadas?: number
  estado_carga: "completo" | "pendiente_completar"
  numero_factura_reservado: string
  concepto_original: string
  concepto_libre: string
}

export type TarifaNombre = "clase_grupo" | "bono_familia" | "clase_privada" | "clase_recuperada"
export type TarifaTipoCobro = "por_hora" | "mensual" | "bono_familiar"
export type TarifaMarca = Marca

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
