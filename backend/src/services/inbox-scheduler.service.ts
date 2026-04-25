import { prisma } from "../config/prisma";
import { syncInbox } from "./imap.service";
import { decrypt } from "../utils/crypto";
import { logger } from "../utils/logger";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let timer: ReturnType<typeof setInterval> | null = null;

export function startInboxScheduler(): void {
  if (timer) return; // already running

  logger.info("[InboxScheduler] Starting — sync interval: 5 min");

  // Run once immediately on startup, then on interval
  runSync();
  timer = setInterval(runSync, SYNC_INTERVAL_MS);
}

export function stopInboxScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info("[InboxScheduler] Stopped");
  }
}

async function runSync(): Promise<void> {
  let accounts: { userId: string; email: string; host: string; port: number; password: string }[] = [];

  try {
    const rows = await prisma.imapAccount.findMany({
      where: { isActive: true },
      select: { userId: true, email: true, host: true, port: true, password: true },
    });

    accounts = rows.map((r) => ({
      ...r,
      password: decrypt(r.password),
    }));
  } catch (err) {
    logger.error("[InboxScheduler] Failed to load accounts:", err);
    return;
  }

  if (accounts.length === 0) return;

  logger.info(`[InboxScheduler] Syncing ${accounts.length} account(s)`);

  // Sync all accounts in parallel — isolated errors per account
  await Promise.allSettled(
    accounts.map((acc) =>
      syncInbox(acc).catch((err) =>
        logger.error(`[InboxScheduler] Sync failed for ${acc.email}:`, err)
      )
    )
  );
}
