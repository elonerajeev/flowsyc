import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    reportError("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-border/60 bg-secondary/30">
          <Compass className="h-10 w-10 text-muted-foreground/50" />
        </div>

        {/* Code */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Error 404
        </p>

        {/* Title */}
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Page not found
        </h1>

        {/* Message */}
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The route{" "}
          <code className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-xs font-mono text-foreground">
            {location.pathname}
          </code>{" "}
          doesn't exist in this workspace.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/30 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/60"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <button
            onClick={() => navigate("/overview")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
            )}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
