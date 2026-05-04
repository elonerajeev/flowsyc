import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Github, Twitter } from "lucide-react";

export default function ContactPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: POST to /api/contact
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#030308] px-4 py-20">
      <div className="mx-auto max-w-xl">
        <button onClick={() => navigate("/")} className="mb-8 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Get in Touch</h1>
          <p className="mt-3 text-base text-white/40">Have a question about Flowsyc? We'd love to hear from you.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-[#2A8F7A]/20 bg-[#2A8F7A]/5 p-8 text-center">
            <p className="text-lg font-semibold text-white">Message sent!</p>
            <p className="mt-2 text-sm text-white/40">We'll get back to you within 24 hours.</p>
            <button onClick={() => navigate("/")} className="mt-6 rounded-xl bg-[#5355D6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5355D6]/90">
              Back to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#5355D6]/50 focus:ring-1 focus:ring-[#5355D6]/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#5355D6]/50 focus:ring-1 focus:ring-[#5355D6]/30"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#5355D6]/50 focus:ring-1 focus:ring-[#5355D6]/30 resize-none"
                placeholder="Tell us how we can help..."
              />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#5355D6] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/20 hover:bg-[#5355D6]/90 transition-all">
              Send Message
            </button>
          </form>
        )}

        <div className="mt-10 flex items-center justify-center gap-6 border-t border-white/5 pt-8">
          <a href="mailto:hello@flowsyc.com" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
            <Mail className="h-3.5 w-3.5" /> hello@flowsyc.com
          </a>
          <a href="https://github.com/elonerajeev/flowsyc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
          <a href="https://twitter.com/elonerajeev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
            <Twitter className="h-3.5 w-3.5" /> Twitter
          </a>
        </div>
      </div>
    </div>
  );
}
