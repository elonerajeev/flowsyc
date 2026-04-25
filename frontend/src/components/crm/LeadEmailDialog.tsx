import { useState } from "react";
import { Mail, Send, Clock, Inbox, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { crmService } from "@/services/crm";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: { id: number; firstName: string; lastName: string; email: string };
}

const TEMPLATES = [
  {
    label: "Introduction",
    subject: "Introduction from {{senderName}}",
    body: "Hi {{firstName}},\n\nI wanted to reach out and introduce myself. I'd love to learn more about your needs and see how we can help.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards",
  },
  {
    label: "Follow-up",
    subject: "Following up — {{firstName}}",
    body: "Hi {{firstName}},\n\nJust following up on my previous message. I wanted to make sure it didn't get lost in your inbox.\n\nLooking forward to connecting!\n\nBest regards",
  },
  {
    label: "Proposal",
    subject: "Proposal for {{company}}",
    body: "Hi {{firstName}},\n\nThank you for your time. As discussed, I'm sharing our proposal for your review.\n\nPlease let me know if you have any questions or would like to discuss further.\n\nBest regards",
  },
];

export default function LeadEmailDialog({ open, onClose, lead }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");
  const [sending, setSending] = useState(false);

  // Email history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["lead-emails", lead.id],
    queryFn: () => crmService.getLeadEmails(lead.id),
    enabled: open,
    staleTime: 30_000,
  });

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSubject(tpl.subject.replace("{{firstName}}", lead.firstName));
    setBody(tpl.body
      .replace(/\{\{firstName\}\}/g, lead.firstName)
      .replace(/\{\{company\}\}/g, "your company")
      .replace(/\{\{senderName\}\}/g, "the team")
    );
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      await crmService.sendLeadEmail(lead.id, { subject: subject.trim(), body: body.trim() });
      toast.success(`Email sent to ${lead.email}`, {
        description: lead.status === "new" ? "Lead status auto-advanced to 'Contacted'" : undefined,
      });
      setSubject("");
      setBody("");
      onClose();
    } catch (err) {
      toast.error("Failed to send email. Check your SMTP settings.");
    } finally {
      setSending(false);
    }
  };

  const allEmails = [
    ...(history?.sent ?? []),
    ...(history?.received ?? []),
  ].sort((a, b) => {
    const aDate = "sentAt" in a ? a.sentAt ?? a.createdAt : a.receivedAt;
    const bDate = "sentAt" in b ? b.sentAt ?? b.createdAt : b.receivedAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email — {lead.firstName} {lead.lastName}
            <span className="text-xs font-normal text-muted-foreground ml-1">{lead.email}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="compose" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="compose" className="flex-1 gap-1.5">
              <Send className="w-3.5 h-3.5" /> Compose
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <Clock className="w-3.5 h-3.5" /> History
              {allEmails.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">{allEmails.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Compose ── */}
          <TabsContent value="compose" className="flex-1 flex flex-col gap-3 mt-3 overflow-auto">
            {/* Quick templates */}
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground self-center">Templates:</span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input value={lead.email} disabled className="bg-muted/40 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[180px] text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {lead.status === "new" && "Sending will auto-advance lead to 'Contacted'"}
              </p>
              <Button onClick={handleSend} disabled={sending || !subject || !body} className="gap-2">
                <Send className="w-3.5 h-3.5" />
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" className="flex-1 overflow-auto mt-3">
            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : allEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Inbox className="w-8 h-8 opacity-30" />
                <p className="text-sm">No email history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allEmails.map((email) => {
                  const isOutbound = email.direction === "outbound";
                  const date = isOutbound
                    ? ("sentAt" in email ? email.sentAt ?? email.createdAt : email.createdAt)
                    : ("receivedAt" in email ? email.receivedAt : "");
                  return (
                    <div
                      key={`${email.direction}-${email.id}`}
                      className={cn(
                        "rounded-lg border p-3 text-sm",
                        isOutbound ? "bg-primary/5 border-primary/20" : "bg-muted/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          {isOutbound
                            ? <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          <span className="font-medium truncate">{email.subject}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={isOutbound ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                            {isOutbound ? "Sent" : "Received"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ""}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {email.body?.replace(/\s+/g, " ").trim()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
