import { motion } from "framer-motion";
import { Lock, ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RADIUS, SPACING } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function RestrictedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "this section";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "max-w-md border border-border/70 bg-card/80 p-10 shadow-2xl backdrop-blur-sm",
          RADIUS.xl
        )}
      >
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/5 shadow-inner">
          <div className="absolute inset-0 animate-pulse rounded-full bg-destructive/10" />
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Administrative Access Required
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You tried to access <span className="font-semibold text-foreground">{from}</span>, which is restricted to higher-level administrative roles.
          </p>
          <div className="rounded-2xl bg-secondary/30 p-4 text-xs italic text-muted-foreground">
            "Security is not a product, but a process. This area contains sensitive business data protected by role-based access control (RBAC)."
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 gap-2 rounded-2xl font-semibold"
          >
            <Home className="h-4 w-4" />
            Back to Overview
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 gap-2 rounded-2xl border-border/70 font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Page
          </Button>
        </div>
      </motion.div>
      
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">
        Enterprise Security Protocol v4.2
      </p>
    </div>
  );
}
