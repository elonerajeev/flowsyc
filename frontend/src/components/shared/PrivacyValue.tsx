import { memo } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PrivacyValueProps {
  value: string | number;
  className?: string;
  blur?: boolean;
  type?: "text" | "number" | "email" | "phone"; // hint for masking style
}

export const PrivacyValue = memo(function PrivacyValue({ value, className, blur = false, type }: PrivacyValueProps) {
  const { privacyMode } = useWorkspace();

  if (!privacyMode) {
    return <span className={className}>{value}</span>;
  }

  if (blur) {
    return (
      <span
        className={cn("select-none blur-[6px] transition-all duration-300 pointer-events-none", className)}
        aria-hidden="true"
      >
        {value}
      </span>
    );
  }

  // Smart masking based on type
  const str = String(value);
  let masked: string;

  if (type === "email" || str.includes("@")) {
    // show first char + domain hint: j***@***.com
    const [local, domain] = str.split("@");
    masked = `${local[0] ?? "•"}${"•".repeat(3)}@${"•".repeat(3)}.${domain?.split(".").pop() ?? "•••"}`;
  } else if (type === "phone" || /^\+?[\d\s\-()]{7,}$/.test(str)) {
    masked = str.slice(0, 2) + "•".repeat(str.length - 4) + str.slice(-2);
  } else if (type === "number" || /^[$£€₹]?[\d,]+/.test(str)) {
    // keep currency symbol, mask digits
    const symbol = str.match(/^[$£€₹]/)?.[0] ?? "";
    masked = symbol + "••••";
  } else {
    // generic: show first char, mask rest
    masked = str[0] + "•".repeat(Math.min(str.length - 1, 6));
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 select-none font-mono tracking-widest text-muted-foreground/50",
        className
      )}
      title="Hidden — privacy mode is on"
      aria-label="Sensitive data hidden"
    >
      {masked}
    </span>
  );
});
