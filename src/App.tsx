import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import TeamPage from "@/pages/TeamPage";
import ClientsPage from "@/pages/ClientsPage";
import TasksPage from "@/pages/TasksPage";
import ProjectsPage from "@/pages/ProjectsPage";
import HiringPage from "@/pages/HiringPage";
import RolesPage from "@/pages/RolesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CalendarPage from "@/pages/CalendarPage";
import MessagesPage from "@/pages/MessagesPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/hiring" element={<HiringPage />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
