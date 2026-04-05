import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const routeMap: Record<string, string> = {
  overview: "Home",
  activity: "Activity Feed",
  messages: "Messages",
  people: "People",
  team: "Professional Team",
  employees: "Employee Roster",
  attendance: "Attendance Hub",
  workspace: "Workspace",
  tasks: "Action Tasks",
  projects: "Execution Portfolio",
  calendar: "Event Calendar",
  notes: "Internal Notes",
  sales: "Sales & Client Growth",
  clients: "Client Accounts",
  pipelines: "Deal Pipelines",
  finance: "Financial Operations",
  invoices: "Invoice Ledger",
  reports: "Executive Reports",
  hr: "Human Resources",
  hiring: "Strategic Hiring",
  candidates: "Candidate Pipeline",
  payroll: "Payroll Center",
  insights: "Insights & Intelligence",
  analytics: "Advanced Analytics",
  system: "System Panel",
  access: "Access & Permissions",
  settings: "Profile Settings",
  integrations: "External Integrations",
  billing: "Billing & Subscription",
  audit: "Security Audit Log",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = useMemo(() => 
    location.pathname.split("/").filter((x) => x),
    [location.pathname]
  );

  if (pathnames.length === 0 || pathnames[0] === "login" || pathnames[0] === "signup") {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 transition-all">
      <Link
        to="/overview"
        className="flex items-center gap-1.5 transition-colors hover:text-primary"
      >
        <Home className="h-3 w-3" />
        <span className="sr-only sm:not-sr-only">Home</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeMap[name.toLowerCase()] || name;

        return (
          <div key={name} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
            {isLast ? (
              <span className="font-bold text-foreground transition-all">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="transition-colors hover:text-primary whitespace-nowrap"
              >
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
