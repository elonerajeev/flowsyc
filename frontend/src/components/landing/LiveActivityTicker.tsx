import { useEffect, useState } from "react";
import { UserCheck, FileText, TrendingUp, CheckCircle2, Users, Zap, Bell } from "lucide-react";

const events = [
  { icon: UserCheck, text: "New client onboarded", detail: "Acme Corp", color: "#2A8F7A" },
  { icon: TrendingUp, text: "Deal closed", detail: "$45,000 — TechFlow Inc", color: "#5355D6" },
  { icon: FileText, text: "Invoice paid", detail: "$12,400 received", color: "#2A8F7A" },
  { icon: CheckCircle2, text: "Task completed", detail: "Dashboard redesign", color: "#7B7FFF" },
  { icon: Zap, text: "Automation triggered", detail: "Lead auto-assigned", color: "#F0A030" },
  { icon: Users, text: "Team member added", detail: "Engineering dept", color: "#5355D6" },
  { icon: Bell, text: "Alert fired", detail: "Pipeline below target", color: "#DC3545" },
  { icon: TrendingUp, text: "Lead converted", detail: "DataDriven Co → Deal", color: "#2A8F7A" },
  { icon: FileText, text: "Report generated", detail: "Q2 Revenue Summary", color: "#7B7FFF" },
  { icon: CheckCircle2, text: "Project milestone hit", detail: "Mobile App MVP — 50%", color: "#F0A030" },
];

const locations = ["Mumbai", "Bangalore", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"];

export default function LiveActivityTicker() {
  const [visible, setVisible] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setVisible((v) => (v + 1) % events.length);
        setShow(true);
      }, 400);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const event = events[visible];
  const location = locations[visible % locations.length];

  return (
    <section id="activity" className="mx-auto max-w-6xl px-4 pb-4">
      <div
        className={`flex items-center justify-center gap-3 transition-all duration-400 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: event.color }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: event.color }} />
          </span>
          <event.icon className="h-3.5 w-3.5" style={{ color: event.color }} />
          <span className="text-xs text-white/50">
            <span className="font-medium text-white/70">{event.text}</span>
            {" · "}
            <span>{event.detail}</span>
            {" · "}
            <span className="text-white/30">{location}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
