import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import MasterSidebar from "./MasterSidebar";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import FloatingElements from "@/components/shared/FloatingElements";
import { getSectionForPath, type SidebarSectionKey } from "./sidebarConfig";
import { readStoredString, writeStoredString } from "@/lib/preferences";

const MASTER_WIDTH = 72;
const DEFAULT_DETAIL_WIDTH = 240;
const MIN_DETAIL_WIDTH = 92;
const MAX_DETAIL_WIDTH = 360;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<SidebarSectionKey>(() => getSectionForPath(location.pathname));
  const [detailWidth, setDetailWidth] = useState(() => {
    const saved = Number(readStoredString("crm-detail-sidebar-width", ""));
    if (Number.isFinite(saved)) {
      return Math.min(MAX_DETAIL_WIDTH, Math.max(MIN_DETAIL_WIDTH, saved));
    }
    return DEFAULT_DETAIL_WIDTH;
  });

  useEffect(() => {
    setActiveSection(getSectionForPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    writeStoredString("crm-detail-sidebar-width", String(detailWidth));
  }, [detailWidth]);

  const beginResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = detailWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setDetailWidth(Math.min(MAX_DETAIL_WIDTH, Math.max(MIN_DETAIL_WIDTH, nextWidth)));
    };

    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [detailWidth]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--info)_/_0.08),transparent_22%),radial-gradient(circle_at_80%_12%,hsl(var(--accent)_/_0.06),transparent_18%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]" />
      <FloatingElements />
      <MasterSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <Sidebar activeSection={activeSection} width={detailWidth} onResizeStart={beginResize} />
      <div
        className="sidebar-transition relative z-10 min-h-screen"
        style={{ marginLeft: `${MASTER_WIDTH + detailWidth}px` }}
      >
        <Navbar />
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
