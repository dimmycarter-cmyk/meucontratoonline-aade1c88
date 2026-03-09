import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import RoleRoute from "@/components/RoleRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Contatos from "./pages/app/Contatos";
import Empresas from "./pages/app/Empresas";
import Contratos from "./pages/app/Contratos";
import ContratoDetalhe from "./pages/app/ContratoDetalhe";
import NovoContrato from "./pages/app/NovoContrato";
import Modelos from "./pages/app/Modelos";
import Clausulas from "./pages/app/Clausulas";
import AgenteIA from "./pages/app/AgenteIA";
import Configuracoes from "./pages/app/Configuracoes";
import Admin from "./pages/app/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute skipOnboardingCheck>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="usuarios" element={<Contatos />} />
              <Route path="empresas" element={<RoleRoute allowedRoles={["super_admin"]}><Empresas /></RoleRoute>} />
              <Route path="contratos" element={<Contratos />} />
              <Route path="contratos/:id" element={<ContratoDetalhe />} />
              <Route path="novo-contrato" element={<NovoContrato />} />
              <Route path="modelos" element={<RoleRoute allowedRoles={["admin_empresa", "super_admin"]}><Modelos /></RoleRoute>} />
              <Route path="clausulas" element={<RoleRoute allowedRoles={["admin_empresa", "super_admin"]}><Clausulas /></RoleRoute>} />
              <Route path="agente-ia" element={<RoleRoute allowedRoles={["admin_empresa", "super_admin"]}><AgenteIA /></RoleRoute>} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route
                path="admin"
                element={
                  <SuperAdminRoute>
                    <Admin />
                  </SuperAdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
