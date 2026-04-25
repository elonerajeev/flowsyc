import { useState, useEffect, useCallback } from "react";
import { Mail, RefreshCw, Star, StarOff, Settings, Wifi, WifiOff, Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { inboxApi, type InboxEmail, type ImapAccount } from "@/services/inbox";
import { formatDistanceToNow } from "date-fns";

export default function InboxPage() {
  const [account, setAccount]       = useState<ImapAccount | null | undefined>(undefined); // undefined = loading
  const [emails, setEmails]         = useState<InboxEmail[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected]     = useState<InboxEmail | null>(null);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [showSetup, setShowSetup]   = useState(false);

  // ── Load account on mount ──────────────────────────────────────────────────
  useEffect(() => {
    inboxApi.getAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  // ── Load inbox when account is ready ──────────────────────────────────────
  const loadInbox = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await inboxApi.getInbox({ page, search: search || undefined, unreadOnly });
      setEmails(res.data);
      setTotal(res.pagination.total);
    } catch {
      toast({ title: "Failed to load inbox", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [account, page, search, unreadOnly]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await inboxApi.syncNow();
      toast({ title: `Synced ${result.synced} email(s)` });
      loadInbox();
    } catch (err: any) {
      toast({ title: err?.response?.data?.error ?? "Sync failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Open email ────────────────────────────────────────────────────────────
  const openEmail = async (email: InboxEmail) => {
    setSelected(email);
    if (!email.isRead) {
      await inboxApi.markRead(email.id, true).catch(() => {});
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, isRead: true } : e));
    }
    // Fetch full body
    const full = await inboxApi.getEmail(email.id).catch(() => null);
    if (full) setSelected(full);
  };

  // ── Star toggle ───────────────────────────────────────────────────────────
  const handleStar = async (e: React.MouseEvent, email: InboxEmail) => {
    e.stopPropagation();
    await inboxApi.toggleStar(email.id).catch(() => {});
    setEmails((prev) => prev.map((em) => em.id === email.id ? { ...em, isStarred: !em.isStarred } : em));
  };

  // ── No account state ──────────────────────────────────────────────────────
  if (account === undefined) {
    return <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No inbox connected</h2>
        <p className="text-muted-foreground max-w-sm">
          Connect your Gmail (or any IMAP mailbox) to see emails linked to your leads and clients.
        </p>
        <Button onClick={() => setShowSetup(true)}>
          <Mail className="w-4 h-4 mr-2" /> Connect Inbox
        </Button>
        <SetupDialog open={showSetup} onClose={() => setShowSetup(false)} onConnected={setAccount} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-80 border-r flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            <span className="font-semibold">Inbox</span>
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={handleSync} disabled={syncing} title="Sync now">
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShowSetup(true)} title="Settings">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Connected account */}
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b">
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="truncate">{account.email}</span>
          {account.lastSync && (
            <span className="ml-auto shrink-0">
              {formatDistanceToNow(new Date(account.lastSync), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="p-3 space-y-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button
            size="sm"
            variant={unreadOnly ? "default" : "outline"}
            className="w-full h-7 text-xs"
            onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
          >
            {unreadOnly ? "Showing unread" : "All emails"}
          </Button>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : emails.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No emails found</div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => openEmail(email)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                  selected?.id === email.id ? "bg-muted" : ""
                } ${!email.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!email.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium"}`}>
                        {email.fromName || email.fromEmail}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{email.subject}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-70">{email.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                    </span>
                    <button onClick={(e) => handleStar(e, email)} className="opacity-60 hover:opacity-100">
                      {email.isStarred
                        ? <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        : <StarOff className="w-3.5 h-3.5" />}
                    </button>
                    {email.entityType && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {email.entityType}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span>Page {page}</span>
            <Button size="sm" variant="ghost" disabled={emails.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* ── Email Detail ── */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <EmailDetail email={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Mail className="w-10 h-10 opacity-30" />
            <p className="text-sm">Select an email to read</p>
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

// ── Email Detail Component ────────────────────────────────────────────────────

function EmailDetail({ email }: { email: InboxEmail }) {
  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-xl font-semibold mb-1">{email.subject}</h2>
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
        <span><strong>From:</strong> {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}</span>
        <Separator orientation="vertical" className="h-4" />
        <span>{new Date(email.receivedAt).toLocaleString()}</span>
        {email.entityType && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">{email.entityType} #{email.entityId}</Badge>
          </>
        )}
      </div>
      <Separator className="mb-4" />
      {email.htmlBody ? (
        <iframe
          srcDoc={email.htmlBody}
          className="w-full min-h-[500px] border-0 rounded"
          sandbox="allow-same-origin"
          title="Email content"
        />
      ) : (
        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{email.body}</pre>
      )}
    </div>
  );
}

// ── Setup Dialog ──────────────────────────────────────────────────────────────

function SetupDialog({
  open, onClose, onConnected, existingAccount,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (a: ImapAccount) => void;
  existingAccount?: ImapAccount | null;
}) {
  const [email, setEmail]       = useState(existingAccount?.email ?? "");
  const [password, setPassword] = useState("");
  const [host, setHost]         = useState(existingAccount?.host ?? "imap.gmail.com");
  const [port, setPort]         = useState(String(existingAccount?.port ?? 993));
  const [loading, setLoading]   = useState(false);

  const handleConnect = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const account = await inboxApi.connect({ email, password, host, port: Number(port) });
      toast({ title: "Inbox connected successfully!" });
      onConnected(account);
      onClose();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.error ?? "Connection failed",
        description: "Make sure you're using a Gmail App Password, not your login password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await inboxApi.disconnect().catch(() => {});
    toast({ title: "Inbox disconnected" });
    onConnected(null as any);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingAccount ? "Inbox Settings" : "Connect Your Inbox"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Use a <strong>Gmail App Password</strong> — not your login password.{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              Generate one here
            </a>
          </p>

          <div className="space-y-2">
            <Label>Email address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" type="email" />
          </div>

          <div className="space-y-2">
            <Label>App Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>IMAP Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="993" type="number" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleConnect} disabled={loading || !email || !password}>
              {loading ? "Connecting..." : existingAccount ? "Update" : "Connect"}
            </Button>
            {existingAccount && (
              <Button variant="destructive" onClick={handleDisconnect}>Disconnect</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
