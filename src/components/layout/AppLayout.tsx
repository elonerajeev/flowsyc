import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={cn("sidebar-transition", collapsed ? "ml-[72px]" : "ml-[260px]")}>
        <Navbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
