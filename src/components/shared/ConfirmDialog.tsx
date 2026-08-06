import { useState, type ReactNode } from "react"

interface Props { children: ReactNode; onConfirm: () => void }

export default function ConfirmDialog({ children, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Estas seguro?</h3>
            <p className="text-slate-700 text-sm mb-4">Esta accion no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">Cancelar</button>
              <button onClick={() => { onConfirm(); setOpen(false) }} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
