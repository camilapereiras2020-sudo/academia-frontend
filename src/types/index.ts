export interface Aviso {
  id: number; titulo: string; fecha: string | null; hecha: boolean
  para: number | null; para_nombre: string | null
  creado_por: number; creado_por_nombre: string; created_at: string
}

export interface EquipoUser {
  id: number; username: string; email: string; role: string
}

export interface Pagador {
  id: number; nombre: string; nif: string; telefono: string; email: string
  direccion: string
  metodo: string; frecuencia: string; iban: string; notas: string
  fnac: string | null; aviso_cumple_dias: number | null; alumnos_count: number
  es_alumno_adulto: boolean
}

export interface Grupo {
  id: number; nombre: string; nivel: string; profesor: number | null; profesor_nombre?: string | null
  tarifa: number; aula: string
  marca: Marca; marca_display?: string
  color_idx: number; horarios: { dia: number; ini: string; fin: string }[]; alumnos_count: number
}

export interface Profesor {
  id: number; nombre: string; codigo: string; es_suplente: boolean
  orden: number; activo: boolean; created_at: string
}

export interface Aula {
  id: number; nombre: string; codigo: string; activo: boolean; created_at: string
}

export interface AlumnoGrupo {
  grupo: number; grupo_nombre: string; horarios: { dia: number; ini: string; fin: string }[]
  // Personal window within the class's own session — null means "the full
  // session" (a student who arrives late / leaves early gets a narrower one).
  hora_inicio: string | null; hora_fin: string | null
}

export type Marca = "cami_and_co" | "rangers_academy"

export type CategoriaNivel = "kids" | "teens" | "adults"

export interface Nivel {
  id: number; nombre: string; categoria: CategoriaNivel; categoria_display: string
  orden: number; activo: boolean; created_at: string
}

export type NivelObjetivo = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type ExamenObjetivo = "KET" | "PET" | "FCE" | "CAE" | "CPE" | "ninguno"
export type Curso =
  | "infantil_3" | "infantil_4" | "infantil_5"
  | "primaria_1" | "primaria_2" | "primaria_3" | "primaria_4" | "primaria_5" | "primaria_6"
  | "eso_1" | "eso_2" | "eso_3" | "eso_4"
  | "bach_1" | "bach_2"
  | "fp" | "adulto" | "otro"

export interface Alumno {
  id: number; nombre: string; marca: Marca; marca_display?: string
  fnac: string | null; telefono: string; email: string; dni: string; nivel: string
  notas: string; aviso_cumple_dias: number | null; pagador: number | null
  es_adulto: boolean
  activo: boolean
  motivo_baja: string
  fecha_baja: string | null
  grupos_detalle: AlumnoGrupo[]; created_at: string
  foto_url: string
  nivel_objetivo: NivelObjetivo | ""
  examen_objetivo: ExamenObjetivo | ""
  curso: Curso | ""
  curso_display?: string
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

export type TipoConsentimiento = "autorizacion_imagen" | "proteccion_datos" | "matricula" | "politica_cancelacion"

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
  emisor: number | null; emisor_nombre?: string | null
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

export interface PagadorCalculoItem {
  tipo: "clase_grupo" | "bono_familia"
  alumnos: string[]
  dias_semana: number
  duracion_min: number
  precio: number
  descuento_pct: number
}

export interface PagadorCalculo {
  pagador_id: number
  pagador_nombre: string
  items: PagadorCalculoItem[]
  cuota_mensual_estimada: number
  avisos: string[]
}

export interface PaginatedResponse<T> {
  count: number; next: string | null; previous: string | null; results: T[]
}
