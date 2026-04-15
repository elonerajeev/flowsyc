import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video, Calendar, Clock, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { crmService } from "@/services/crm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: number;
  clientId?: number;
  contactId?: number;
  inviteeName?: string;
  inviteeEmail?: string;
}

// Default to current time rounded up to next 30min
function defaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() >= 30 ? 60 : 30, 0, 0);
  return now.toISOString().slice(0, 16);
}

const MEETING_TYPES = [
  { value: "discovery", label: "Discovery" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "onboarding", label: "Onboarding" },
  { value: "check_in", label: "Check-in" },
  { value: "other", label: "Other" },
];

export default function ScheduleMeetingDialog({
  open, onOpenChange, leadId, clientId, contactId,
  inviteeName = "", inviteeEmail = "",
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("discovery");
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState(inviteeName);
  const [email, setEmail] = useState(inviteeEmail);
  const [agenda, setAgenda] = useState("");

  const mutation = useMutation({
    mutationFn: () => crmService.createMeeting({
      leadId, clientId, contactId,
      title,
      type,
      scheduledAt,
      duration: Number(duration),
      meetingType: "google",
      inviteeName: name,
      inviteeEmail: email,
      agenda,
    }),
    onSuccess: (res: { data?: { meetingUrl?: string } }) => {
      const meetingUrl = res?.data?.meetingUrl;
      toast.success("Meeting scheduled! Invite sent to " + email, {
        action: meetingUrl ? { label: "Join", onClick: () => window.open(meetingUrl, "_blank") } : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      onOpenChange(false);
      setTitle(""); setAgenda(""); setScheduledAt(defaultDateTime());
    },
    onError: () => toast.error("Failed to schedule meeting"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || !name.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4 text-primary" />
            Schedule Google Meet
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Title *</Label>
            <Input placeholder="e.g. Product Demo" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Date & Time *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["15","15 min"],["30","30 min"],["45","45 min"],["60","1 hour"],["90","1.5 hrs"],["120","2 hours"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Invitee *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Agenda (optional)</Label>
            <Textarea placeholder="What will you discuss?" value={agenda} onChange={e => setAgenda(e.target.value)} rows={2} className="resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-1.5">
              <Video className="h-3.5 w-3.5" />
              {mutation.isPending ? "Scheduling..." : "Schedule & Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
