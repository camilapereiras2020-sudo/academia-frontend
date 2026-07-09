import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "@/router/ProtectedRoute"
import AppShell from "@/components/layout/AppShell"
import LoginPage from "@/features/auth/pages/LoginPage"
import RegisterPage from "@/features/auth/pages/RegisterPage"
import DashboardPage from "@/features/dashboard/pages/DashboardPage"
import AlumnosPage from "@/features/alumnos/pages/AlumnosPage"
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
import VocabGame from "@/features/games/pages/VocabGame"
import FlashcardGame from "@/features/games/pages/FlashcardGame"
import MemoryMatch from "@/features/games/pages/MemoryMatch"
import WordScramble from "@/features/games/pages/WordScramble"
import EmpresasPage from "@/features/empresas/pages/EmpresasPage"
import WhatsAppReplyPage from "@/features/whatsapp/pages/WhatsAppReplyPage"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alumnos" element={<AlumnosPage />} />
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
          <Route path="/juegos/vocab" element={<VocabGame />} />
          <Route path="/juegos/flashcards" element={<FlashcardGame />} />
          <Route path="/juegos/memoria" element={<MemoryMatch />} />
          <Route path="/juegos/scramble" element={<WordScramble />} />
          <Route path="/empresas" element={<EmpresasPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}