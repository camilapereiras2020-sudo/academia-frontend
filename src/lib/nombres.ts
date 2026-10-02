// Nombre visible de un usuario a partir de su username o email (las cuentas
// se crearon en minúscula y sin tilde: "candela", "sofia"). Los nombres del
// equipo se escriben bien; cualquier otro, con la primera letra en mayúscula.
const EQUIPO: Record<string, string> = {
  candela: "Candela",
  sofia: "Sofía",
}

export function nombreUsuario(raw: string | null | undefined): string {
  if (!raw) return ""
  let s = raw.trim()
  if (s.includes("@")) s = s.split("@")[0].split(/[._-]/)[0]
  const clave = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  return EQUIPO[clave] ?? s.charAt(0).toUpperCase() + s.slice(1)
}
