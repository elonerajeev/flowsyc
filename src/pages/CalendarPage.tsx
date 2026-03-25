import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const events = [
  { id: 1, title: "Team standup", time: "9:00 AM", day: 25, color: "bg-primary/20 text-primary border-primary/30", emoji: "🗣️" },
  { id: 2, title: "Client call - Acme", time: "11:00 AM", day: 25, color: "bg-success/20 text-success border-success/30", emoji: "📞" },
  { id: 3, title: "Design review", time: "2:00 PM", day: 26, color: "bg-accent/20 text-accent border-accent/30", emoji: "🎨" },
  { id: 4, title: "Sprint planning", time: "10:00 AM", day: 27, color: "bg-warning/20 text-warning border-warning/30", emoji: "📋" },
  { id: 5, title: "Investor meeting", time: "3:00 PM", day: 28, color: "bg-destructive/20 text-destructive border-destructive/30", emoji: "💼" },
  { id: 6, title: "Product demo", time: "1:00 PM", day: 25, color: "bg-info/20 text-info border-info/30", emoji: "🚀" },
];

const upcomingEvents = [
  { title: "Team standup", time: "Today, 9:00 AM", emoji: "🗣️" },
  { title: "Client call - Acme Corp", time: "Today, 11:00 AM", emoji: "📞" },
  { title: "Product demo", time: "Today, 1:00 PM", emoji: "🚀" },
  { title: "Design review", time: "Tomorrow, 2:00 PM", emoji: "🎨" },
  { title: "Sprint planning", time: "Wed, 10:00 AM", emoji: "📋" },
  { title: "Investor meeting", time: "Thu, 3:00 PM", emoji: "💼" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function CalendarPage() {
  const today = 25;
  const daysInMonth = 31;
  const startDay = 6; // Saturday

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">Calendar 📅</h1>
          <p className="text-sm text-muted-foreground mt-1">March 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors">Today</button>
          <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"><ChevronRight className="h-4 w-4" /></button>
          <button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"><Plus className="h-4 w-4" /> New Event</button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-card overflow-hidden">
          <div className="grid grid-cols-7">
            {daysOfWeek.map((d) => (
              <div key={d} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/30">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = day ? events.filter((e) => e.day === day) : [];
              return (
                <div key={i} className={cn(
                  "min-h-[100px] border-b border-r border-border p-2 transition-colors hover:bg-secondary/20",
                  !day && "bg-muted/30",
                  day === today && "bg-primary/[0.04]"
                )}>
                  {day && (
                    <>
                      <span className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                        day === today ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div key={e.id} className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium truncate", e.color)}>
                            {e.emoji} {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-card h-fit">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Upcoming
          </h3>
          <div className="space-y-0">
            {upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                <span className="text-lg mt-0.5">{e.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
