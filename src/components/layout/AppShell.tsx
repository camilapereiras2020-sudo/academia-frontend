
import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import RemindersModal from "@/features/crm/components/RemindersModal"

// Below `xl` (1280px) — every tablet (iPad included, both orientations) and
// phone — the sidebar hides behind a hamburger instead of eating 250px of a
// screen that doesn't have it to spare. `xl` and up keeps the old always-on
// sidebar behavior untouched.
export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--dark)' }}>
      {/* Backdrop — tablet/phone only, tapping it closes the sidebar same as
          the X button inside it. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8">
          <div className="fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <RemindersModal />
    </div>
  )
}
