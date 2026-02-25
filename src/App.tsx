import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsListPage from "./pages/ClientsListPage";
import ClientFormPage from "./pages/ClientFormPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import ServiceFormPage from "./pages/ServiceFormPage";
import PlanFormPage from "./pages/PlanFormPage";
import PlanCheckoutPage from "./pages/PlanCheckoutPage";
import PlansListPage from "./pages/PlansListPage";
import ProductsPage from "./pages/ProductsPage";
import ServiceItemsPage from "./pages/ServiceItemsPage";
import MenuPage from "./pages/MenuPage";
import BarbersPage from "./pages/BarbersPage";
import MessageTemplatesPage from "./pages/MessageTemplatesPage";
import OrdersPage from "./pages/OrdersPage";
import StorePage from "./pages/store/StorePage";
import StoreCheckoutPage from "./pages/store/StoreCheckoutPage";
import WhatsAppOAuthCallbackPage from "./pages/WhatsAppOAuthCallbackPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/loja" element={<StorePage />} />
          <Route path="/loja/checkout/:productId" element={<StoreCheckoutPage />} />
          <Route path="/whatsapp-oauth-callback" element={<WhatsAppOAuthCallbackPage />} />

          {/* Protected Admin Routes */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><ClientsListPage /></ProtectedRoute>} />
          <Route path="/clientes/novo" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
          <Route path="/clientes/editar/:id" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
          <Route path="/clientes/:id" element={<ProtectedRoute><ClientProfilePage /></ProtectedRoute>} />
          <Route path="/atendimento" element={<ProtectedRoute><ServiceFormPage /></ProtectedRoute>} />
          <Route path="/planos" element={<ProtectedRoute><PlansListPage /></ProtectedRoute>} />
          <Route path="/planos/novo" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/planos/editar/:id" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/planos/checkout/:planId" element={<ProtectedRoute><PlanCheckoutPage /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
          <Route path="/servicos-cadastrados" element={<ProtectedRoute><ServiceItemsPage /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
          <Route path="/barbeiros" element={<ProtectedRoute><BarbersPage /></ProtectedRoute>} />
          <Route path="/mensagens" element={<ProtectedRoute><MessageTemplatesPage /></ProtectedRoute>} />
          <Route path="/whatsapp-config" element={<ProtectedRoute><MessageTemplatesPage /></ProtectedRoute>} />
          <Route path="/configuracoes/whatsapp" element={<ProtectedRoute><MessageTemplatesPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

