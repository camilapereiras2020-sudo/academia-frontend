import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "@/router/ProtectedRoute"
import RoleProtectedRoute from "@/router/RoleProtectedRoute"
import AppShell from "@/components/layout/AppShell"
import LoginPage from "@/features/auth/pages/LoginPage"
import RegisterPage from "@/features/auth/pages/RegisterPage"
import DashboardPage from "@/features/dashboard/pages/DashboardPage"
import AlumnosPage from "@/features/alumnos/pages/AlumnosPage"
import AlumnoDetailPage from "@/features/alumnos/pages/AlumnoDetailPage"
import PagadoresPage from "@/features/pagadores/pages/PagadoresPage"
import GruposPage from "@/features/grupos/pages/GruposPage"
import GrupoDetailPage from "@/features/grupos/pages/GrupoDetailPage"
import AsistenciaPage from "@/features/asistencia/pages/AsistenciaPage"
import PagosPage from "@/features/pagos/pages/PagosPage"
import NuevoPagoPage from "@/features/pagos/pages/NuevoPagoPage"
import PagosPendientesPage from "@/features/pagos/pages/PagosPendientesPage"
import CumpleanosPage from "@/features/cumpleanos/pages/CumpleanosPage"
import DocumentosPage from "@/features/documentos/pages/DocumentosPage"
import ConfigPage from "@/features/config/pages/ConfigPage"
import PendientesPage from "@/features/pendientes/pages/PendientesPage"
import CRMPage from "@/features/crm/Pages/CRMPage"
import EmpresasPage from "@/features/empresas/pages/EmpresasPage"
import WhatsAppReplyPage from "@/features/whatsapp/pages/WhatsAppReplyPage"
import FacturacionPage from "@/features/facturacion/pages/FacturacionPage"
import RangersHomePage from "@/features/rangers/pages/RangersHomePage"

function DefaultRedirect() {
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing homepage. "/" is already taken by the authenticated
          app's DefaultRedirect (index route -> /dashboard), so the new public
          site lives at /rangers instead of overwriting that behavior. */}
      <Route path="/rangers" element={<RangersHomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DefaultRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/alumnos" element={<AlumnosPage />} />
            <Route path="/alumnos/:id" element={<AlumnoDetailPage />} />
            <Route path="/pagadores" element={<PagadoresPage />} />
            <Route path="/grupos" element={<GruposPage />} />
            <Route path="/grupos/:id" element={<GrupoDetailPage />} />
            <Route path="/asistencia" element={<AsistenciaPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/pagos/nuevo" element={<NuevoPagoPage />} />
            <Route path="/pagos/pendientes" element={<PagosPendientesPage />} />
            <Route path="/cumpleanos" element={<CumpleanosPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/pendientes" element={<PendientesPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/whatsapp-respuestas" element={<WhatsAppReplyPage />} />
            <Route path="/empresas" element={<EmpresasPage />} />
            <Route path="/facturacion" element={<FacturacionPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}
