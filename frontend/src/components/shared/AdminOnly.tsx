import { Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  children: React.ReactNode;
  roles?: Array<"admin" | "manager">;
};

export default function AdminOnly({ children, roles = ["admin", "manager"] }: Props) {
  const { role } = useTheme();
  if (roles.includes(role as "admin" | "manager")) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Restricted Access</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This section is only available to {roles.join(" and ")}s. Contact your admin if you need access.
        </p>
      </div>
    </div>
  );
}
