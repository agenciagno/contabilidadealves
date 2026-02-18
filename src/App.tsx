import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import RecurringBills from "@/pages/RecurringBills";
import Contacts from "@/pages/Contacts";
import ContactProfile from "@/pages/ContactProfile";
import Banks from "@/pages/Banks";
import Categories from "@/pages/Categories";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import CrmDispatches from "@/pages/CrmDispatches";
import ClientReport from "@/pages/ClientReport";
import Boletos from "@/pages/Boletos";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NotificationProvider>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout><Home /></AppLayout>} />
              <Route path="/painel-financeiro" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/movimentacoes" element={<AppLayout><Transactions /></AppLayout>} />
              <Route path="/recorrentes" element={<AppLayout><RecurringBills /></AppLayout>} />
              <Route path="/contatos" element={<AppLayout><Contacts /></AppLayout>} />
              <Route path="/crm/cliente/:id" element={<AppLayout><ContactProfile /></AppLayout>} />
              <Route path="/bancos" element={<AppLayout><Banks /></AppLayout>} />
              <Route path="/categorias" element={<AppLayout><Categories /></AppLayout>} />
              <Route path="/relatorios" element={<AppLayout><Reports /></AppLayout>} />
              <Route path="/configuracoes" element={<AppLayout><SettingsPage /></AppLayout>} />
              <Route path="/disparos" element={<AppLayout><CrmDispatches /></AppLayout>} />
              <Route path="/relatorio-clientes" element={<AppLayout><ClientReport /></AppLayout>} />
              <Route path="/boletos" element={<AppLayout><Boletos /></AppLayout>} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
