import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import MasterSidebar from "./MasterSidebar";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MobileBottomNav from "./MobileBottomNav";
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
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="hidden md:block">
        <MasterSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <Sidebar activeSection={activeSection} width={detailWidth} onResizeStart={beginResize} />
      </div>
      <div
        className="sidebar-transition relative z-10 min-h-screen md:ml-[var(--sidebar-offset)]"
        style={{ ["--sidebar-offset" as string]: `${MASTER_WIDTH + detailWidth}px` }}
      >
        <Navbar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 14, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.992 }}
            transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.85 }}
            className="mx-auto w-full max-w-[1600px] p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8 md:pb-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
      <MobileBottomNav />
    </div>
  );
}
