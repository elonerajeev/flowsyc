import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/layout/AppLayout";
import RouteAccessGuard from "@/components/layout/RouteAccessGuard";
import PageLoader from "@/components/shared/PageLoader";
import CommandPalette from "@/components/crm/CommandPalette";
import QuickCreateDialog from "@/components/crm/QuickCreateDialog";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const EmployeesPage = lazy(() => import("@/pages/TeamPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const LeadsPage = lazy(() => import("@/pages/LeadsPage"));
const DealsPage = lazy(() => import("@/pages/DealsPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));
const HiringPage = lazy(() => import("@/pages/HiringPage"));
const CandidatesPage = lazy(() => import("@/pages/HiringPage"));
const RolesPage = lazy(() => import("@/pages/RolesPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const IntegrationsPage = lazy(() => import("@/pages/IntegrationsPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 20,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CommandPalette />
            <QuickCreateDialog />
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<RouteAccessGuard><Dashboard /></RouteAccessGuard>} />
                  <Route path="/overview/activity" element={<RouteAccessGuard><ActivityPage /></RouteAccessGuard>} />
                  <Route path="/overview/messages" element={<RouteAccessGuard><MessagesPage /></RouteAccessGuard>} />

                  <Route path="/people/team" element={<RouteAccessGuard><TeamPage /></RouteAccessGuard>} />
                  <Route path="/people/employees" element={<RouteAccessGuard><EmployeesPage /></RouteAccessGuard>} />
                  <Route path="/people/attendance" element={<RouteAccessGuard><AttendancePage /></RouteAccessGuard>} />
                  <Route path="/people/roles" element={<RouteAccessGuard><RolesPage /></RouteAccessGuard>} />

                  <Route path="/workspace/tasks" element={<RouteAccessGuard><TasksPage /></RouteAccessGuard>} />
                  <Route path="/workspace/projects" element={<RouteAccessGuard><ProjectsPage /></RouteAccessGuard>} />
                  <Route path="/workspace/calendar" element={<RouteAccessGuard><CalendarPage /></RouteAccessGuard>} />
                  <Route path="/workspace/notes" element={<RouteAccessGuard><NotesPage /></RouteAccessGuard>} />

                  <Route path="/sales/clients" element={<RouteAccessGuard><ClientsPage /></RouteAccessGuard>} />
                  <Route path="/sales/leads" element={<RouteAccessGuard><LeadsPage /></RouteAccessGuard>} />
                  <Route path="/sales/deals" element={<RouteAccessGuard><DealsPage /></RouteAccessGuard>} />

                  <Route path="/finance/invoices" element={<RouteAccessGuard><InvoicesPage /></RouteAccessGuard>} />
                  <Route path="/finance/payments" element={<RouteAccessGuard><PaymentsPage /></RouteAccessGuard>} />
                  <Route path="/finance/expenses" element={<RouteAccessGuard><ExpensesPage /></RouteAccessGuard>} />
                  <Route path="/finance/reports" element={<RouteAccessGuard><ReportsPage /></RouteAccessGuard>} />

                  <Route path="/hr/hiring" element={<RouteAccessGuard><HiringPage /></RouteAccessGuard>} />
                  <Route path="/hr/candidates" element={<RouteAccessGuard><CandidatesPage /></RouteAccessGuard>} />
                  <Route path="/hr/employees" element={<RouteAccessGuard><EmployeesPage /></RouteAccessGuard>} />

                  <Route path="/insights/analytics" element={<RouteAccessGuard><AnalyticsPage /></RouteAccessGuard>} />

                  <Route path="/system/settings" element={<RouteAccessGuard><SettingsPage /></RouteAccessGuard>} />
                  <Route path="/system/integrations" element={<RouteAccessGuard><IntegrationsPage /></RouteAccessGuard>} />
                  <Route path="/system/billing" element={<RouteAccessGuard><BillingPage /></RouteAccessGuard>} />

                  <Route path="/activity" element={<Navigate to="/overview/activity" replace />} />
                  <Route path="/team" element={<Navigate to="/people/team" replace />} />
                  <Route path="/employees" element={<Navigate to="/people/employees" replace />} />
                  <Route path="/clients" element={<Navigate to="/sales/clients" replace />} />
                  <Route path="/leads" element={<Navigate to="/sales/leads" replace />} />
                  <Route path="/deals" element={<Navigate to="/sales/deals" replace />} />
                  <Route path="/attendance" element={<Navigate to="/people/attendance" replace />} />
                  <Route path="/tasks" element={<Navigate to="/workspace/tasks" replace />} />
                  <Route path="/projects" element={<Navigate to="/workspace/projects" replace />} />
                  <Route path="/notes" element={<Navigate to="/workspace/notes" replace />} />
                  <Route path="/hiring" element={<Navigate to="/hr/hiring" replace />} />
                  <Route path="/candidates" element={<Navigate to="/hr/candidates" replace />} />
                  <Route path="/roles" element={<Navigate to="/people/roles" replace />} />
                  <Route path="/analytics" element={<Navigate to="/insights/analytics" replace />} />
                  <Route path="/calendar" element={<Navigate to="/workspace/calendar" replace />} />
                  <Route path="/messages" element={<Navigate to="/overview/messages" replace />} />
                  <Route path="/invoices" element={<Navigate to="/finance/invoices" replace />} />
                  <Route path="/payments" element={<Navigate to="/finance/payments" replace />} />
                  <Route path="/expenses" element={<Navigate to="/finance/expenses" replace />} />
                  <Route path="/reports" element={<Navigate to="/finance/reports" replace />} />
                  <Route path="/integrations" element={<Navigate to="/system/integrations" replace />} />
                  <Route path="/billing" element={<Navigate to="/system/billing" replace />} />
                  <Route path="/settings" element={<Navigate to="/system/settings" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
