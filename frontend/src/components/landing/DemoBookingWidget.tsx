import { useState } from "react";
import { X, Calendar, Check, ChevronRight, Clock, Loader2 } from "lucide-react";
import { crmService } from "@/services/crm";

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

export default function DemoBookingWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "" });
  const [selectedTime, setSelectedTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.email || !selectedTime) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await crmService.submitDemoBooking({
        name: form.name,
        email: form.email,
        company: form.company || undefined,
        teamSize: form.size || undefined,
        preferredTime: selectedTime,
      });
      setServerMessage(result.message);
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setStep(0);
      setForm({ name: "", email: "", company: "", size: "" });
      setSelectedTime("");
      setSubmitted(false);
      setSubmitting(false);
      setError("");
      setServerMessage("");
    }, 300);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#5355D6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/30 transition-all hover:shadow-[#5355D6]/50 hover:scale-[1.03]"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Book a Demo</span>
        <span className="sm:hidden">Demo</span>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={reset} />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-[440px] rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:rounded-2xl sm:p-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Close */}
            <button onClick={reset} className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              /* ── Success ── */
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2A8F7A]/10">
                  <Check className="h-7 w-7 text-[#2A8F7A]" />
                </div>
                <h3 className="text-lg font-bold text-foreground">You're on the list!</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  {serverMessage || "A product specialist will reach out within 24 hours to schedule your personalized walkthrough."}
                </p>
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Confirmation sent to <span className="font-semibold text-foreground/80">{form.email}</span>
                </p>
                <button
                  onClick={reset}
                  className="mt-6 rounded-xl bg-[#5355D6] px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-[#5355D6]">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Book a Demo</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-foreground">See Flowsyc in action</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Fill in your details and we'll set up a personalized 15-minute walkthrough.</p>
                </div>

                {/* Steps indicator */}
                <div className="mb-6 flex items-center gap-2">
                  {[0, 1].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                        step >= s ? "bg-[#5355D6] text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {s + 1}
                      </div>
                      {s === 0 && <div className={`h-px w-8 transition-colors ${step >= 1 ? "bg-[#5355D6]" : "bg-border"}`} />}
                    </div>
                  ))}
                </div>

                {step === 0 ? (
                  /* ── Step 1: Details ── */
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name *</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Smith"
                        className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition focus:border-[#5355D6]/40 focus:bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Work Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@company.com"
                        className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition focus:border-[#5355D6]/40 focus:bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company</label>
                      <input
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        placeholder="Acme Corp"
                        className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition focus:border-[#5355D6]/40 focus:bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Team Size</label>
                      <select
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-[#5355D6]/40 focus:bg-muted/50"
                      >
                        <option value="">Select...</option>
                        <option value="1-5">1-5</option>
                        <option value="6-20">6-20</option>
                        <option value="21-50">21-50</option>
                        <option value="50+">50+</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      disabled={!form.name || !form.email}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5355D6] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* ── Step 2: Time slot ── */
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Pick a preferred time slot
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                            selectedTime === t
                              ? "border-[#5355D6]/40 bg-[#5355D6]/10 text-[#5355D6]"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-[#5355D6]/20 hover:bg-[#5355D6]/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/40">* We'll confirm the exact time via email</p>
                    {error && (
                      <p className="text-xs text-red-500 text-center">{error}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStep(0)}
                        disabled={submitting}
                        className="flex-1 rounded-xl border border-border bg-muted/30 px-6 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted/50 disabled:opacity-40"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!selectedTime || submitting}
                        className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-[#5355D6] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                        ) : (
                          "Confirm Booking"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
