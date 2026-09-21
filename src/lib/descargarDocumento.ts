// Un solo lugar para el fetch+blob+nombre de archivo al descargar una
// factura/recibo — antes cada pantalla (Facturación, ficha del alumno,
// PagoDetailModal, GenerarFacturaModal, DocumentosPage) lo reimplementaba
// a mano, y varias se quedaron sin poner `num_doc`/alumno en el nombre —
// el navegador terminaba sugiriendo un nombre al azar al guardar el PDF.
export interface DocumentoDescargable {
  id: number
  num_doc: string
  nombre?: string
}

export async function descargarDocumento(doc: DocumentoDescargable, cliente?: string | null) {
  const token = localStorage.getItem("access_token")
  const base = import.meta.env.VITE_API_URL ?? "/api/v1"
  const res = await fetch(`${base}/documentos/${doc.id}/descargar/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`No se pudo descargar el documento (código ${res.status}).`)
  }
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const base_name = doc.num_doc || doc.nombre?.replace(/\.pdf$/i, "") || `documento-${doc.id}`
  const filename = `${base_name}${cliente ? " " + cliente : ""}.pdf`.replace(/[\\/:*?"<>|]/g, "")
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => window.URL.revokeObjectURL(url), 10000)
}
