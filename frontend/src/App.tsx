import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import AppLayout from "@/components/layout/AppLayout";
import RouteAccessGuard from "@/components/layout/RouteAccessGuard";
import PageLoader from "@/components/shared/PageLoader";
import AppErrorBoundary from "@/components/shared/AppErrorBoundary";
import NetworkErrorBridge from "@/components/shared/NetworkErrorBridge";
const CommandPalette = lazy(() => import("@/components/crm/CommandPalette"));
const QuickCreateDialog = lazy(() => import("@/components/crm/QuickCreateDialog"));
import { AuthProvider } from "@/contexts/AuthContext";
import { useMonitoring } from "@/hooks/use-monitoring";
import { Analytics } from '@vercel/analytics/react';

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const GoogleCallback = lazy(() => import("@/pages/GoogleCallbackPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const TeamsPage = lazy(() => import("@/pages/TeamsPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const ContactsPage = lazy(() => import("@/pages/ContactsPage"));
const LeadsPage = lazy(() => import("@/pages/LeadsPage"));
const SalesPage = lazy(() => import("@/pages/SalesPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));
const HiringPage = lazy(() => import("@/pages/HiringPage"));
const CandidatesPage = lazy(() => import("@/pages/CandidatesPage"));
const PayrollPage = lazy(() => import("@/pages/PayrollPage"));
const AccessPermissionsPage = lazy(() => import("@/pages/RolesPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
const FinancePage = lazy(() => import("@/pages/FinancePage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const IntegrationsPage = lazy(() => import("@/pages/IntegrationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AuditLogPage = lazy(() => import("@/pages/AuditLogPage"));
const RestrictedPage = lazy(() => import("@/pages/RestrictedPage"));
const AutomationRulesPage = lazy(() => import("@/pages/AutomationRulesPage"));
const AutomationAlertsPage = lazy(() => import("@/pages/AutomationAlertsPage"));
const AutomationScheduledPage = lazy(() => import("@/pages/AutomationScheduledPage"));
const AutomationLogsPage = lazy(() => import("@/pages/AutomationLogsPage"));
const GTMOpsPage = lazy(() => import("@/pages/GTMOpsPage"));
const GTMFlowPage = lazy(() => import("@/pages/GTMFlowPage"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));

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

const App = () => {
  // Initialize monitoring
  useMonitoring();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider>
            <WorkspaceProvider>
              <NotificationProvider>
                <TooltipProvider>
                  <AppErrorBoundary>
                    <Toaster />
                    <Sonner />
                    <NetworkErrorBridge />
                    <Analytics />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <Routes>
                        <Route
                          path="/login"
                          element={
                            <Suspense fallback={<PageLoader />}>
                              <LoginPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/signup"
                          element={
                            <Suspense fallback={<PageLoader />}>
                              <SignupPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/verify-email"
                          element={
                            <Suspense fallback={<PageLoader />}>
                              <VerifyEmailPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/auth/google/callback"
                          element={
                            <Suspense fallback={<PageLoader />}>
                              <GoogleCallback />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/*"
                          element={
                            <>
                              <Suspense fallback={null}>
                                <CommandPalette />
                                <QuickCreateDialog />
                              </Suspense>
                              <AppLayout>
                                <Suspense fallback={<PageLoader />}>
                                  <Routes>
                                    <Route path="/" element={<Navigate to="/overview" replace />} />
                                    <Route path="/overview" element={<RouteAccessGuard><Dashboard /></RouteAccessGuard>} />
                                    <Route path="/overview/activity" element={<RouteAccessGuard><ActivityPage /></RouteAccessGuard>} />
                                    <Route path="/overview/messages" element={<RouteAccessGuard><MessagesPage /></RouteAccessGuard>} />
                                    <Route path="/overview/inbox" element={<RouteAccessGuard><InboxPage /></RouteAccessGuard>} />

                                    <Route path="/people/team" element={<Navigate to="/people/teams" replace />} />
                                    <Route path="/people/teams" element={<RouteAccessGuard><TeamsPage /></RouteAccessGuard>} />
                                    <Route path="/people/members" element={<RouteAccessGuard><TeamPage /></RouteAccessGuard>} />
                                    <Route path="/people/employees" element={<Navigate to="/people/members" replace />} />
                                    <Route path="/people/attendance" element={<RouteAccessGuard><AttendancePage /></RouteAccessGuard>} />
                                    <Route path="/people/roles" element={<Navigate to="/system/access" replace />} />

                                    <Route path="/workspace/tasks" element={<RouteAccessGuard><TasksPage /></RouteAccessGuard>} />
                                    <Route path="/workspace/projects" element={<RouteAccessGuard><ProjectsPage /></RouteAccessGuard>} />
                                    <Route path="/workspace/calendar" element={<RouteAccessGuard><CalendarPage /></RouteAccessGuard>} />
                                    <Route path="/workspace/notes" element={<RouteAccessGuard><NotesPage /></RouteAccessGuard>} />

                                    <Route path="/sales/clients" element={<RouteAccessGuard><ClientsPage /></RouteAccessGuard>} />
                                    <Route path="/sales/contacts" element={<RouteAccessGuard><ContactsPage /></RouteAccessGuard>} />
                                    <Route path="/sales/leads" element={<RouteAccessGuard><LeadsPage /></RouteAccessGuard>} />
                                    <Route path="/sales/pipelines" element={<RouteAccessGuard><SalesPage /></RouteAccessGuard>} />

                                    <Route path="/finance/invoices" element={<RouteAccessGuard><InvoicesPage /></RouteAccessGuard>} />
                                    <Route path="/finance" element={<RouteAccessGuard><FinancePage /></RouteAccessGuard>} />
                                    <Route path="/finance/payments" element={<Navigate to="/finance" replace />} />
                                    <Route path="/finance/expenses" element={<Navigate to="/finance" replace />} />
                                    <Route path="/finance/billing" element={<Navigate to="/finance" replace />} />
                                    <Route path="/finance/reports" element={<RouteAccessGuard><ReportsPage /></RouteAccessGuard>} />

                                    <Route path="/hr/hiring" element={<RouteAccessGuard><HiringPage /></RouteAccessGuard>} />
                                    <Route path="/hr/candidates" element={<RouteAccessGuard><CandidatesPage /></RouteAccessGuard>} />
                                    <Route path="/hr/employees" element={<Navigate to="/people/members" replace />} />
                                    <Route path="/hr/payroll" element={<RouteAccessGuard><PayrollPage /></RouteAccessGuard>} />

                                    <Route path="/insights/analytics" element={<RouteAccessGuard><AnalyticsPage /></RouteAccessGuard>} />

                                    <Route path="/automation/rules" element={<RouteAccessGuard><AutomationRulesPage /></RouteAccessGuard>} />
                                    <Route path="/automation/gtm" element={<RouteAccessGuard><GTMOpsPage /></RouteAccessGuard>} />
                                    <Route path="/automation/flow" element={<RouteAccessGuard><GTMFlowPage /></RouteAccessGuard>} />
                                    <Route path="/automation/alerts" element={<RouteAccessGuard><AutomationAlertsPage /></RouteAccessGuard>} />
                                    <Route path="/automation/scheduled" element={<RouteAccessGuard><AutomationScheduledPage /></RouteAccessGuard>} />
                                    <Route path="/automation/logs" element={<RouteAccessGuard><AutomationLogsPage /></RouteAccessGuard>} />

                                    <Route path="/system/access" element={<RouteAccessGuard><AccessPermissionsPage /></RouteAccessGuard>} />
                                    <Route path="/system/settings" element={<RouteAccessGuard><SettingsPage /></RouteAccessGuard>} />
                                    <Route path="/system/integrations" element={<RouteAccessGuard><IntegrationsPage /></RouteAccessGuard>} />
                                    <Route path="/system/billing" element={<RouteAccessGuard><BillingPage /></RouteAccessGuard>} />
                                    <Route path="/system/audit" element={<RouteAccessGuard><AuditLogPage /></RouteAccessGuard>} />

                                    <Route path="/activity" element={<Navigate to="/overview/activity" replace />} />
                                    <Route path="/team" element={<Navigate to="/people/teams" replace />} />
                                    <Route path="/teams" element={<Navigate to="/people/teams" replace />} />
                                    <Route path="/members" element={<Navigate to="/people/members" replace />} />
                                    <Route path="/employees" element={<Navigate to="/people/members" replace />} />
                                    <Route path="/clients" element={<Navigate to="/sales/clients" replace />} />
                                    <Route path="/leads" element={<Navigate to="/sales/leads" replace />} />
                                    <Route path="/deals" element={<Navigate to="/sales/pipelines" replace />} />
                                    <Route path="/sales" element={<Navigate to="/sales/pipelines" replace />} />
                                    <Route path="/attendance" element={<Navigate to="/people/attendance" replace />} />
                                    <Route path="/tasks" element={<Navigate to="/workspace/tasks" replace />} />
                                    <Route path="/projects" element={<Navigate to="/workspace/projects" replace />} />
                                    <Route path="/notes" element={<Navigate to="/workspace/notes" replace />} />
                                    <Route path="/hiring" element={<Navigate to="/hr/hiring" replace />} />
                                    <Route path="/candidates" element={<Navigate to="/hr/candidates" replace />} />
                                    <Route path="/hr/salary" element={<Navigate to="/hr/payroll" replace />} />
                                    <Route path="/salary" element={<Navigate to="/hr/payroll" replace />} />
                                    <Route path="/payroll" element={<Navigate to="/hr/payroll" replace />} />
                                    <Route path="/roles" element={<Navigate to="/system/access" replace />} />
                                    <Route path="/analytics" element={<Navigate to="/insights/analytics" replace />} />
                                    <Route path="/calendar" element={<Navigate to="/workspace/calendar" replace />} />
                                    <Route path="/messages" element={<Navigate to="/overview/messages" replace />} />
                                    <Route path="/invoices" element={<Navigate to="/finance/invoices" replace />} />
                                    <Route path="/payments" element={<Navigate to="/finance" replace />} />
                                    <Route path="/expenses" element={<Navigate to="/finance" replace />} />
                                    <Route path="/reports" element={<Navigate to="/finance/reports" replace />} />
                                    <Route path="/integrations" element={<Navigate to="/system/integrations" replace />} />
                                    <Route path="/billing" element={<Navigate to="/finance" replace />} />
                                    <Route path="/settings" element={<Navigate to="/system/settings" replace />} />
                                    <Route path="/restricted" element={<RestrictedPage />} />
                                    <Route path="*" element={<NotFound />} />
                                  </Routes>
                                </Suspense>
                              </AppLayout>
                            </>
                          }
                        />
                      </Routes>
                    </BrowserRouter>
                  </AppErrorBoundary>
                </TooltipProvider>
              </NotificationProvider>
            </WorkspaceProvider>
          </RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
