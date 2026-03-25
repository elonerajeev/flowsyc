import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";
import { getAccessiblePathForRole, getAllowedRolesForPath } from "./sidebarConfig";
import { cn } from "@/lib/utils";

interface RouteAccessGuardProps {
  children: ReactNode;
}

export default function RouteAccessGuard({ children }: RouteAccessGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useTheme();

  const allowedRoles = getAllowedRolesForPath(location.pathname);

  if (!allowedRoles) {
    return <Navigate to={getAccessiblePathForRole(role)} replace />;
  }

  if (!allowedRoles.includes(role)) {
    const fallback = getAccessiblePathForRole(role);

    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-border/70 bg-card/90 p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Access restricted</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">You do not have access to this page</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Your current role is <span className="font-semibold text-foreground">{role}</span>. This section is hidden in the frontend until your backend permissions are connected.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(fallback)}
              className={cn("inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105")}
            >
              <Lock className="h-4 w-4" />
              Go to allowed area
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
