import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { isRemoteApiEnabled } from "@/lib/api-client";
import { getAccessiblePathForRole, getAllowedRolesForPath } from "./sidebarConfig";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface RouteAccessGuardProps {
  children: ReactNode;
}

export default function RouteAccessGuard({ children }: RouteAccessGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useTheme();
  const { user } = useAuth();
  const effectiveRole = user?.role ?? role;

  if (isRemoteApiEnabled() && !user) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = getAllowedRolesForPath(location.pathname);

  if (!allowedRoles) {
    return <Navigate to={getAccessiblePathForRole(effectiveRole)} replace />;
  }

  if (!allowedRoles.includes(effectiveRole)) {
    const fallback = getAccessiblePathForRole(effectiveRole);

    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
        <div className={cn("w-full max-w-xl border border-border/70 bg-card/90 text-center shadow-card", RADIUS.xl, SPACING.card)}>
          <div className={cn("mx-auto flex h-14 w-14 items-center justify-center bg-destructive/10 text-destructive", RADIUS.lg)}>
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className={cn("mt-4 font-semibold uppercase tracking-[0.2em] text-muted-foreground", TEXT.eyebrow)}>Access restricted</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">You do not have access to this page</h1>
          <p className={cn("mx-auto mt-3 max-w-lg text-muted-foreground", TEXT.bodyRelaxed)}>
            Your current role is <span className="font-semibold text-foreground">{effectiveRole}</span>. This section is hidden in the frontend until your backend permissions are connected.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(fallback)}
              className={cn("inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground transition hover:brightness-105", RADIUS.lg, SPACING.button, TEXT.body)}
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
