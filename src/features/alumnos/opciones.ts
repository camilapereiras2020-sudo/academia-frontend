// Opciones de los campos académicos del alumno, compartidas por la ficha
// (Datos generales) y el formulario de alta/edición de AlumnosPage.
import type { NivelObjetivo, ExamenObjetivo, Curso } from "@/types"

export const NIVELES: NivelObjetivo[] = ["A1", "A2", "B1", "B2", "C1", "C2"]
export const EXAMENES: ExamenObjetivo[] = ["KET", "PET", "FCE", "CAE", "CPE", "ninguno"]
export const CURSOS: { value: Curso; label: string }[] = [
  { value: "infantil_3", label: "Infantil 3 años" }, { value: "infantil_4", label: "Infantil 4 años" },
  { value: "infantil_5", label: "Infantil 5 años" },
  { value: "primaria_1", label: "1º Primaria" }, { value: "primaria_2", label: "2º Primaria" },
  { value: "primaria_3", label: "3º Primaria" }, { value: "primaria_4", label: "4º Primaria" },
  { value: "primaria_5", label: "5º Primaria" }, { value: "primaria_6", label: "6º Primaria" },
  { value: "eso_1", label: "1º ESO" }, { value: "eso_2", label: "2º ESO" },
  { value: "eso_3", label: "3º ESO" }, { value: "eso_4", label: "4º ESO" },
  { value: "bach_1", label: "1º Bachillerato" }, { value: "bach_2", label: "2º Bachillerato" },
  { value: "fp", label: "Formación Profesional" }, { value: "adulto", label: "Adulto" }, { value: "otro", label: "Otro" },
]
// Público/concertado/privado en Pontevedra y Poio — recopilado a mano
// (paxinasgalegas.es agosto 2026; IES públicos de Pontevedra añadidos en
// septiembre 2026 tras faltar en la primera pasada), puede faltar algún
// centro nuevo o de otro ayuntamiento cercano. Por eso "Colegio de origen"
// sigue siendo texto libre con estas como sugerencias (datalist), nunca un
// desplegable cerrado.
export const COLEGIOS_SUGERIDOS = [
  // Pontevedra — público
  "CEIP A Carballeira", "CEIP A Xunqueira Nº 1", "CEIP A Xunqueira Nº 2", "CEIP Álvarez Limeses",
  "CEIP Daría González García", "CEIP de Cabanas", "CEIP de Marcón", "CEIP Froebel",
  "CEIP Manuel Vidal Portela", "CEIP Parada-Campañó", "CEIP Pontesampaio", "CEIP Pza. Barcelos",
  "CEIP San Benito de Lérez", "CEIP San Martiño", "CEIP Santo André de Xeve", "CEIP Vilaverde-Mourente",
  "CEP Campolongo", "CEP Marcos da Portela", "CEE Amencer", "CEE Juan XXIII",
  // Pontevedra — IES (público, secundaria/bacharelato)
  "IES A Xunqueira I", "IES A Xunqueira II", "IES Sánchez Cantón", "IES Valle-Inclán",
  "IES Frei Martín Sarmiento", "IES Montecelo",
  // Pontevedra — concertado
  "CPR Calasancio", "CPR Nuestra Señora de los Dolores (Doroteas)", "CPR Sagrado Corazón de Jesús",
  "CPR Sagrado Corazón de Placeres", "CPR San José",
  // Pontevedra — privado
  "Colegio Santa Apolonia", "Colegio Juan Sebastián Elcano", "Colegio Los Sauces",
  // Poio — público
  "CEIP de Espedregada", "CEIP de Lourido", "CEIP de Viñas", "CEIP Isidora Riestra",
  "CEIP Plurilingüe de Chancelas", "IES de Poio",
  // Poio — privado
  "CPR Sek Atlántico",
]
