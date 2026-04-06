import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, ClipboardList, CreditCard, FolderKanban, Zap, Users, BriefcaseBusiness } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProjects, useClients, useTeamMembers, crmKeys } from "@/hooks/use-crm-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/micro-interactions";
import { crmService } from "@/services/crm";

const workflows = [
  { id: "client",  title: "Client",    description: "Add new client account", icon: Building2,   color: "text-blue-500",   activeBg: "bg-blue-500/10 border-blue-500/30" },
  { id: "lead",    title: "Lead",      description: "Add new sales lead",      icon: Users,       color: "text-rose-500",   activeBg: "bg-rose-500/10 border-rose-500/30" },
  { id: "project", title: "Project",   description: "Create new project",      icon: FolderKanban, color: "text-violet-500", activeBg: "bg-violet-500/10 border-violet-500/30" },
  { id: "task",    title: "Task",      description: "Create new task",        icon: ClipboardList, color: "text-emerald-500", activeBg: "bg-emerald-500/10 border-emerald-500/30" },
  { id: "invoice", title: "Invoice",   description: "Create new invoice",      icon: CreditCard,   color: "text-orange-500", activeBg: "bg-orange-500/10 border-orange-500/30" },
  { id: "job",     title: "Job",       description: "Post new job opening",    icon: BriefcaseBusiness, color: "text-indigo-500", activeBg: "bg-indigo-500/10 border-indigo-500/30" },
];

const tierOptions = ["Growth", "Enterprise", "Strategic"];
const segmentOptions = ["New Business", "Renewal", "Expansion"];
const statusOptions = ["active", "pending", "completed"];
const projectStatusOptions = ["active", "pending", "completed"];
const projectStageOptions = ["Discovery", "Build", "Review", "Launch"];
const priorityOptions = ["high", "medium", "low"];

export default function QuickCreateDialog() {
  const { quickCreateOpen, closeQuickCreate, canUseQuickCreate, workflowToOpen, editData } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [selected, setSelected] = useState(workflows[0].id);

  // Sync with workflowToOpen AND editData when dialog opens
  useEffect(() => {
    if (quickCreateOpen) {
      if (workflowToOpen) setSelected(workflowToOpen);
      
      if (editData) {
        // Pre-fill fields for editing
        setName(editData.name || editData.title || editData.firstName + " " + (editData.lastName || ""));
        setDescription(editData.description || editData.notes || "");
        setPriority(editData.priority || "normal");
        setDueDate(editData.dueDate || (editData.expectedClose ? editData.expectedClose.slice(0, 10) : ""));
        setTags(Array.isArray(editData.tags) ? editData.tags.join(", ") : "");
        setCompany(editData.company || "");
        setIndustry(editData.industry || "");
        setEmail(editData.email || "");
        setPhone(editData.phone || "");
        setLocation(editData.location || "");
        setTier(editData.tier || "Growth");
        setSegment(editData.segment || "New Business");
        setStatus(editData.status || "pending");
        setRevenue(editData.revenue || "");
        setManager(editData.manager || editData.assignedTo || "");
        setProjectStatus(editData.status || "pending");
        setProjectStage(editData.stage || "Discovery");
        setBudget(editData.budget || "$0");
        setProjectTeam(Array.isArray(editData.team) ? editData.team : []);
        setTaskAssigneeValue(editData.assignee || editData.assignedTo || "");
        setTaskProjectId(editData.projectId ? String(editData.projectId) : "none");
        setValueStream(editData.valueStream || "Growth");
        setInvoiceClient(editData.client || "");
        setAmount(editData.amount ? String(editData.amount).replace(/[^0-9.]/g, "") : "0");
        setInvoiceStatus(editData.status || "pending");
      }
    }
  }, [quickCreateOpen, workflowToOpen, editData]);
  
  // Common fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"urgent" | "high" | "normal" | "low">("normal");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  
  // Client & Lead fields
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("General");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [tier, setTier] = useState<"Growth" | "Enterprise" | "Strategic">("Growth");
  const [segment, setSegment] = useState<"New Business" | "Renewal" | "Expansion">("New Business");
  const [status, setStatus] = useState<"active" | "pending" | "completed">("pending");
  const [revenue, setRevenue] = useState("");
  const [manager, setManager] = useState("");
  
  // Project fields
  const [projectStatus, setProjectStatus] = useState<"active" | "pending" | "completed">("pending");
  const [projectStage, setProjectStage] = useState<"Discovery" | "Build" | "Review" | "Launch">("Discovery");
  const [budget, setBudget] = useState("$0");
  const [projectTeam, setProjectTeam] = useState<string[]>([]);
  
  // Task fields
  const [taskAssigneeKind, setTaskAssigneeKind] = useState<"team" | "member">("member");
  const [taskAssigneeValue, setTaskAssigneeValue] = useState("");
  const [taskProjectId, setTaskProjectId] = useState<string>("none");
  const [valueStream, setValueStream] = useState("Growth");
  
  // Invoice fields
  const [invoiceClient, setInvoiceClient] = useState("");
  const [amount, setAmount] = useState("0");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceDue, setInvoiceDue] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"pending" | "paid" | "overdue">("pending");

  const { data: projects = [] } = useProjects({ enabled: quickCreateOpen });
  const { data: clients = [] } = useClients({ enabled: quickCreateOpen });
  const { data: teamMembers = [] } = useTeamMembers({ enabled: quickCreateOpen });

  const selectedWorkflow = useMemo(() => workflows.find(w => w.id === selected) ?? workflows[0], [selected]);
  const availableTeams = useMemo(
    () => Array.from(new Set(teamMembers.map((member) => member.team).filter(Boolean))),
    [teamMembers],
  );
  const availableMembers = useMemo(
    () => teamMembers.map((member) => ({ value: member.email, label: `${member.name} · ${member.designation}` })),
    [teamMembers],
  );
  const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: c.name })), [clients]);

  const inputCls = "h-10 w-full rounded-xl border border-border/70 bg-background/60 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20";
  const selectCls = "h-10 w-full rounded-xl border border-border/70 bg-background/60 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20";

  const resetForm = () => {
    setName(""); setDescription(""); setPriority("normal"); setDueDate(""); setTags("");
    setCompany(""); setIndustry("General"); setEmail(""); setPhone(""); setLocation("");
    setTier("Growth"); setSegment("New Business"); setStatus("pending"); setRevenue(""); setManager("");
    setProjectStatus("pending"); setProjectStage("Discovery"); setBudget("$0"); setProjectTeam([]);
    setTaskAssigneeKind("member"); setTaskAssigneeValue(""); setTaskProjectId("none"); setValueStream("Growth");
    setInvoiceClient(""); setAmount("0"); setInvoiceDate(new Date().toISOString().slice(0, 10)); setInvoiceDue(""); setInvoiceStatus("pending");
  };

  const actionMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const isEdit = !!editData;
      const id = editData?.id;

      if (isEdit) {
        switch (workflowId) {
          case "client": return crmService.updateClient(id, { name, company, industry, email, phone, location, tier, segment, status, revenue, manager });
          case "project": return crmService.updateProject(id, { name, description, status: projectStatus, team: projectTeam, dueDate, stage: projectStage, budget });
          case "task": return crmService.updateTask(id, { title: name, priority: priority as any, dueDate, tags: tags.split(",").map(t => t.trim()), valueStream: valueStream as any, projectId: taskProjectId === "none" ? null : Number(taskProjectId) });
          // Add others as needed
          default: throw new Error(`Editing ${workflowId} not supported yet in Quick Create.`);
        }
      }

      switch (workflowId) {
        case "client":
          return crmService.createClient({
            name: name.trim(),
            company: company.trim() || name.trim(),
            industry,
            email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@client.local`,
            phone: phone.trim(),
            location: location.trim(),
            tier,
            segment,
            status,
            revenue: revenue || "$0",
            manager: manager.trim() || "Unassigned",
            healthScore: 75,
            nextAction: description.trim() || "Follow up",
          });
        case "lead": {
          const [firstName, ...rest] = name.trim().split(" ");
          return crmService.createLead({
            firstName: firstName || "New",
            lastName: rest.join(" ") || "Lead",
            email: email.trim() || `lead.${Date.now()}@example.local`,
            company: company.trim() || "Interest Co",
            jobTitle: "Prospect",
            source: "website",
            status: "new",
            score: 50,
            assignedTo: manager.trim() || "Sarah Johnson",
            notes: description.trim(),
          });
        }
        case "project":
          return crmService.createProject({
            name: name.trim() || "New Project",
            description: description.trim(),
            progress: 0,
            status: projectStatus,
            team: projectTeam.length > 0 ? projectTeam : ["OW"],
            ...(dueDate ? { dueDate } : {}),
            stage: projectStage,
            budget: budget || "$0",
          });
        case "task": {
          const member = availableMembers.find(m => m.value === taskAssigneeValue);
          const assignee = taskAssigneeKind === "team" ? (taskAssigneeValue || "Team") : ((member?.label.split(" · ")[0] ?? taskAssigneeValue) || "Unassigned");
          return crmService.createTask({
            title: name.trim() || "New Task",
            assignee,
            avatar: assignee.slice(0, 2).toUpperCase(),
            priority: (priority === "normal" ? "medium" : priority) as "high" | "medium" | "low",
            ...(dueDate ? { dueDate } : {}),
            tags: tags ? tags.split(",").map(t => t.trim()) : ["Quick Create"],
            valueStream: valueStream as "Growth" | "Product" | "Support",
            projectId: taskProjectId === "none" ? null : Number(taskProjectId),
          });
        }
        case "invoice": {
          const selectedClient = clients.find(c => c.id === Number(invoiceClient));
          return crmService.createInvoice({
            client: selectedClient?.name || name.trim() || "New Client",
            amount: `$${Number(amount || 0).toLocaleString()}`,
            date: invoiceDate,
            ...(invoiceDue ? { due: invoiceDue } : {}),
            status: invoiceStatus,
          });
        }
        case "job":
          return crmService.createJob({
            title: name.trim() || "New Role",
            department: industry || "Engineering",
            location: location || "Remote",
            type: "Full-time",
            status: "open",
            description: description.trim(),
            salary: revenue || "Competitive",
            experience: "2-5 years",
            skills: tags ? tags.split(",").map(t => t.trim()) : [],
            priority: priority || "normal",
            deadline: dueDate || null,
          });
        default: return null;
      }
    },
    onSuccess: async (_, workflowId) => {
      const keyMap: Record<string, unknown[]> = { 
        client: crmKeys.clients, 
        lead: ["leads"],
        project: crmKeys.projects, 
        task: crmKeys.tasks, 
        invoice: crmKeys.invoices,
        job: crmKeys.jobPostings
      };
      await queryClient.invalidateQueries({ queryKey: keyMap[workflowId] });
      if (workflowId === "task") {
        await queryClient.invalidateQueries({ queryKey: crmKeys.projects });
      }
      triggerHaptic("success");
      toast.success(`${selectedWorkflow.title} ${editData ? 'updated' : 'created'}!`);
      closeQuickCreate();
      resetForm();
    },
    onError: () => toast.error(`Failed to ${editData ? 'update' : 'create'} ${selectedWorkflow.title.toLowerCase()}.`),
  });

  if (!canUseQuickCreate) return null;

  const isEdit = !!editData;

  return (
    <Dialog open={quickCreateOpen} onOpenChange={open => !open && closeQuickCreate()}>
      <DialogContent className="w-[min(96vw,56rem)] max-w-none overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-0 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="grid lg:grid-cols-[220px_1fr]">

          {/* Left - workflow picker */}
          <div className="border-b border-border/60 bg-secondary/30 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{isEdit ? "Global Editor" : "Quick Create"}</p>
                <p className="text-[11px] text-muted-foreground">{isEdit ? "Modifying record" : "Admin Panel"}</p>
              </div>
            </div>

            <div className="space-y-2">
              {workflows.map(w => {
                const Icon = w.icon;
                const isActive = w.id === selected;
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={isEdit}
                    onClick={() => setSelected(w.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                      isActive ? w.activeBg : "border-transparent hover:bg-secondary/60",
                      isEdit && !isActive && "opacity-40 grayscale-[0.5]"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? w.color : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>{w.title}</p>
                      <p className="text-[10px] text-muted-foreground/70 line-clamp-1">{w.description}</p>
                    </div>
                    {isActive && <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0", w.color)} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right - form */}
          <div className="p-6">
            <DialogHeader className="mb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="font-display text-xl font-semibold text-foreground">
                    {isEdit ? `Edit ${selectedWorkflow.title}` : selectedWorkflow.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {isEdit ? "Edit mode coming via Quick Create extension" : selectedWorkflow.description}
                  </DialogDescription>
                </div>
                {isEdit && (
                  <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Live Record
                  </div>
                )}
              </div>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Common: Name */}
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name *</span>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={`Enter ${selectedWorkflow.title.toLowerCase()} name`} />
              </label>

              {/* CLIENT & LEAD FIELDS */}
              {(selected === "client" || selected === "lead") && (
                <>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</span>
                    <input value={company} onChange={e => setCompany(e.target.value)} className={inputCls} placeholder="Company name" />
                  </label>
                  {selected === "client" && (
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</span>
                      <input value={industry} onChange={e => setIndustry(e.target.value)} className={inputCls} placeholder="Industry" />
                    </label>
                  )}
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="client@company.com" />
                  </label>
                  {selected === "client" && (
                    <>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</span>
                        <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+1-555-0000" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</span>
                        <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="City, State" />
                      </label>
                    </>
                  )}
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Owner / Manager</span>
                    <input value={manager} onChange={e => setManager(e.target.value)} className={inputCls} placeholder="Account manager" />
                  </label>
                  {selected === "client" && (
                    <>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tier</span>
                        <Select value={tier} onValueChange={v => setTier(v as "Growth" | "Enterprise" | "Strategic")}>
                          <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {tierOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Segment</span>
                        <Select value={segment} onValueChange={v => setSegment(v as "New Business" | "Renewal" | "Expansion")}>
                          <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {segmentOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                        <Select value={status} onValueChange={v => setStatus(v as "active" | "pending" | "completed")}>
                          <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
                        <input value={revenue} onChange={e => setRevenue(e.target.value)} className={inputCls} placeholder="$0" />
                      </label>
                    </>
                  )}
                </>
              )}

              {/* JOB FIELDS */}
              {selected === "job" && (
                <>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</span>
                    <input value={industry} onChange={e => setIndustry(e.target.value)} className={inputCls} placeholder="e.g. Engineering" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</span>
                    <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Remote / NYC" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salary Range</span>
                    <input value={revenue} onChange={e => setRevenue(e.target.value)} className={inputCls} placeholder="e.g. $100K - $130K" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</span>
                    <Select value={priority} onValueChange={v => setPriority(v as "urgent" | "high" | "normal" | "low")}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deadline</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills (comma separated)</span>
                    <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} placeholder="React, Node, SQL" />
                  </label>
                </>
              )}

              {/* PROJECT FIELDS */}
              {selected === "project" && (
                <>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                    <Select value={projectStatus} onValueChange={v => setProjectStatus(v as "active" | "pending" | "completed")}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {projectStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</span>
                    <Select value={projectStage} onValueChange={v => setProjectStage(v as "Discovery" | "Build" | "Review" | "Launch")}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {projectStageOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</span>
                    <input value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} placeholder="$0" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team</span>
                    <Select value={projectTeam[0] || ""} onValueChange={v => setProjectTeam([v])}>
                      <SelectTrigger className={selectCls}><SelectValue placeholder="Select team..." /></SelectTrigger>
                      <SelectContent>
                        {availableTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </label>
                </>
              )}

              {/* TASK FIELDS */}
              {selected === "task" && (
                <>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign to</span>
                    <div className="flex gap-2">
                      <Select value={taskAssigneeKind} onValueChange={v => { setTaskAssigneeKind(v as "team" | "member"); setTaskAssigneeValue(""); }}>
                        <SelectTrigger className="w-28 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={taskAssigneeValue} onValueChange={setTaskAssigneeValue}>
                        <SelectTrigger className="flex-1 h-10 rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {taskAssigneeKind === "member"
                            ? availableMembers.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)
                            : availableTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</span>
                    <Select value={priority} onValueChange={v => setPriority(v as "urgent" | "high" | "normal" | "low")}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</span>
                    <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                      <SelectTrigger className={selectCls}>
                        <SelectValue placeholder="Link to project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No linked project</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Value Stream</span>
                    <Select value={valueStream} onValueChange={setValueStream}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Growth">Growth</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</span>
                    <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} placeholder="tag1, tag2" />
                  </label>
                </>
              )}

              {/* INVOICE FIELDS */}
              {selected === "invoice" && (
                <>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</span>
                    <Select value={invoiceClient} onValueChange={setInvoiceClient}>
                      <SelectTrigger className={selectCls}>
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientOptions.map(c => (
                          <SelectItem key={c.value} value={String(c.value)}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount ($)</span>
                    <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                    <Select value={invoiceStatus} onValueChange={v => setInvoiceStatus(v as "pending" | "paid" | "overdue")}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</span>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                    <input type="date" value={invoiceDue} onChange={e => setInvoiceDue(e.target.value)} className={inputCls} />
                  </label>
                </>
              )}

              {/* Common: Description */}
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none" placeholder="Optional description..." />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { triggerHaptic("selection"); closeQuickCreate(); }} className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                Cancel
              </button>
              <button 
                type="button" 
                disabled={actionMutation.isPending || !name.trim()} 
                onClick={() => actionMutation.mutate(selected)} 
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50", 
                  selectedWorkflow.color.replace("text-", "bg-").replace("-500", "-500 hover:opacity-90")
                )}
              >
                {actionMutation.isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : `Create ${selectedWorkflow.title}`)}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
