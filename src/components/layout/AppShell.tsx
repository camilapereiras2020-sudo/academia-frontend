
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import RemindersModal from "@/features/crm/components/RemindersModal"

export default function AppShell() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--dark)',
    }}>
      <Sidebar />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}>
        <Topbar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem 2.5rem',
        }}>
          <div className="fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <RemindersModal />
    </div>
  )
}
