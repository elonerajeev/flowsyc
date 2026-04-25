import { useState, useEffect, useCallback } from "react";
import {
  Mail, RefreshCw, Star, Settings, Wifi, WifiOff,
  Search, Inbox, Archive, ChevronLeft, ChevronRight,
  MailOpen, Filter, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { inboxApi, type InboxEmail, type ImapAccount } from "@/services/inbox";
import { ApiError } from "@/lib/api-client";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEmailDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-amber-500",
  "bg-emerald-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function avatarColor(email: string) {
  let n = 0;
  for (const c of email) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string, email: string) {
  const src = name || email;
  const parts = src.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [account, setAccount]       = useState<ImapAccount | null | undefined>(undefined);
  const [emails, setEmails]         = useState<InboxEmail[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected]     = useState<InboxEmail | null>(null);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [showSetup, setShowSetup]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    inboxApi.getAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  const loadInbox = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const [res, uc] = await Promise.all([
        inboxApi.getInbox({ page, search: search || undefined, unreadOnly }),
        inboxApi.getUnreadCount(),
      ]);
      setEmails(res.data);
      setTotal(res.pagination.total);
      setUnreadCount(uc.count);
    } catch {
      toast({ title: "Failed to load inbox", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [account, page, search, unreadOnly]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await inboxApi.syncNow();
      toast({ title: `✓ Synced ${result.synced} new email${result.synced !== 1 ? "s" : ""}` });
      loadInbox();
    } catch (err) {
      toast({ title: err instanceof ApiError ? err.message : "Sync failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const openEmail = async (email: InboxEmail) => {
    setSelected(email);
    if (!email.isRead) {
      await inboxApi.markRead(email.id, true).catch(() => {});
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, isRead: true } : e));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    const full = await inboxApi.getEmail(email.id).catch(() => null);
    if (full) setSelected(full);
  };

  const handleStar = async (e: React.MouseEvent, email: InboxEmail) => {
    e.stopPropagation();
    await inboxApi.toggleStar(email.id).catch(() => {});
    setEmails((prev) => prev.map((em) => em.id === email.id ? { ...em, isStarred: !em.isStarred } : em));
    if (selected?.id === email.id) setSelected((s) => s ? { ...s, isStarred: !s.isStarred } : s);
  };

  // ── Empty / loading states ─────────────────────────────────────────────────
  if (account === undefined) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-72 border-r p-4 space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-5 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Connect your inbox</h2>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            Link your Gmail or any IMAP mailbox. Emails from your leads and clients will appear here automatically.
          </p>
        </div>
        <Button size="lg" onClick={() => setShowSetup(true)} className="gap-2">
          <Mail className="w-4 h-4" /> Connect Gmail
        </Button>
        <p className="text-xs text-muted-foreground">Uses Gmail App Password — no OAuth required</p>
        <SetupDialog open={showSetup} onClose={() => setShowSetup(false)} onConnected={setAccount} />
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Left panel: email list ── */}
      <div className="w-[320px] shrink-0 flex flex-col border-r">

        {/* Toolbar */}
        <div className="px-4 py-3 flex items-center justify-between border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Inbox</span>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSync} disabled={syncing} title="Sync">
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSetup(true)} title="Settings">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Account pill */}
        <div className="px-3 py-1.5 flex items-center gap-1.5 border-b bg-muted/10">
          <Wifi className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">{account.email}</span>
          {account.lastSync && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(account.lastSync), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Search + filter */}
        <div className="px-3 py-2 space-y-1.5 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search emails..."
              className="pl-8 h-8 text-xs bg-muted/40 border-0 focus-visible:ring-1"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md w-full transition-colors",
              unreadOnly ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Filter className="w-3 h-3" />
            {unreadOnly ? "Unread only" : "All mail"}
          </button>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <MailOpen className="w-8 h-8 opacity-30" />
              <p className="text-xs">No emails found</p>
            </div>
          ) : (
            <div>
              {emails.map((email) => (
                <div
                  key={email.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEmail(email)}
                  onKeyDown={(e) => e.key === "Enter" && openEmail(email)}
                  className={cn(
                    "group relative flex gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/50",
                    selected?.id === email.id
                      ? "bg-primary/8 border-l-2 border-l-primary"
                      : "hover:bg-muted/50",
                    !email.isRead && selected?.id !== email.id && "bg-blue-50/40 dark:bg-blue-950/15"
                  )}
                >
                  {/* Unread dot */}
                  {!email.isRead && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}

                  {/* Avatar */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5",
                    avatarColor(email.fromEmail)
                  )}>
                    {initials(email.fromName, email.fromEmail)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={cn("text-sm truncate", !email.isRead ? "font-semibold" : "font-medium")}>
                        {email.fromName || email.fromEmail.split("@")[0]}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatEmailDate(email.receivedAt)}
                      </span>
                    </div>
                    <p className={cn("text-xs truncate mb-0.5", !email.isRead ? "text-foreground" : "text-muted-foreground")}>
                      {email.subject}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">
                      {email.body?.replace(/\s+/g, " ").trim().slice(0, 80)}
                    </p>
                  </div>

                  {/* Star */}
                  <button
                    type="button"
                    onClick={(e) => handleStar(e, email)}
                    className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star className={cn("w-3.5 h-3.5", email.isStarred ? "fill-amber-400 text-amber-400 opacity-100" : "text-muted-foreground")}
                      style={email.isStarred ? { opacity: 1 } : {}}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t flex items-center justify-between">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Right panel: email detail ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <EmailDetail
            email={selected}
            onStar={(e) => handleStar({ stopPropagation: () => {} } as React.MouseEvent, e)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Mail className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-medium">Select an email to read</p>
            <p className="text-xs opacity-60">{total} email{total !== 1 ? "s" : ""} in inbox</p>
          </div>
        )}
      </div>

      <SetupDialog
        open={showSetup}
        onClose={() => setShowSetup(false)}
        onConnected={setAccount}
        existingAccount={account}
      />
    </div>
  );
}

// ── Email Detail ──────────────────────────────────────────────────────────────

function EmailDetail({ email, onStar }: { email: InboxEmail; onStar: (e: InboxEmail) => void }) {
  const ini = initials(email.fromName, email.fromEmail);
  const color = avatarColor(email.fromEmail);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-6 pb-5 border-b shrink-0">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="text-xl font-bold leading-tight flex-1">{email.subject}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStar(email)} title="Star">
              <Star className={cn("w-4 h-4", email.isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Archive">
              <Archive className="w-4 h-4 text-muted-foreground" />
            </Button>
            {email.entityType && (
              <Button size="icon" variant="ghost" className="h-8 w-8" title={`View ${email.entityType}`}>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0", color)}>
            {ini}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{email.fromName || email.fromEmail}</span>
              {email.fromName && (
                <span className="text-xs text-muted-foreground">&lt;{email.fromEmail}&gt;</span>
              )}
              {email.entityType && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {email.entityType} #{email.entityId}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <span>to me</span>
              <span>·</span>
              <span>
                {new Date(email.receivedAt).toLocaleString("en-IN", {
                  weekday: "short", day: "numeric", month: "short",
                  year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {email.htmlBody ? (
          <iframe
            srcDoc={email.htmlBody}
            className="w-full h-full min-h-[500px] border-0"
            sandbox="allow-same-origin allow-scripts"
            title="Email content"
          />
        ) : (
          <div className="px-8 py-6 max-w-3xl">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-7 text-foreground">
              {email.body || "(No content)"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Setup Dialog ──────────────────────────────────────────────────────────────

function SetupDialog({
  open, onClose, onConnected, existingAccount,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (a: ImapAccount | null) => void;
  existingAccount?: ImapAccount | null;
}) {
  const [email, setEmail]     = useState(existingAccount?.email ?? "");
  const [password, setPassword] = useState("");
  const [host, setHost]       = useState(existingAccount?.host ?? "imap.gmail.com");
  const [port, setPort]       = useState(String(existingAccount?.port ?? 993));
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const account = await inboxApi.connect({ email, password, host, port: Number(port) });
      toast({ title: "Inbox connected!" });
      onConnected(account);
      onClose();
    } catch (err) {
      toast({
        title: err instanceof ApiError ? err.message : "Connection failed",
        description: "Use a Gmail App Password, not your login password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {existingAccount ? "Inbox Settings" : "Connect Your Inbox"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
            Requires a <strong className="text-foreground">Gmail App Password</strong> (not your login password).{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary underline">
              Generate one →
            </a>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" type="email" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">App Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">IMAP Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.gmail.com" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="993" type="number" className="text-sm" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handleConnect} disabled={loading || !email || !password}>
              {loading ? "Connecting..." : existingAccount ? "Update" : "Connect"}
            </Button>
            {existingAccount && (
              <Button variant="outline" onClick={async () => {
                await inboxApi.disconnect().catch(() => {});
                toast({ title: "Inbox disconnected" });
                onConnected(null);
                onClose();
              }}>
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
