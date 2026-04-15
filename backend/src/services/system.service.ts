import { logger } from "../utils/logger";
import type { ThemePreview } from "../config/types";

export const systemService = {
  getThemePreviews(): Record<string, ThemePreview> {
    return {
      ocean: {
        label: "Ocean",
        subtitle: "Professional SaaS blue",
        vibe: "Best for corporate CRM, sales leadership, and clean data density."
      },
      midnight: {
        label: "Midnight",
        subtitle: "Dark executive mode",
        vibe: "Best for night users, dense dashboards, and high-contrast workflows."
      },
      nebula: {
        label: "Nebula",
        subtitle: "Startup premium gradient",
        vibe: "Best for modern product teams and a more expressive brand feel."
      },
      slate: {
        label: "Slate",
        subtitle: "Minimal enterprise",
        vibe: "Best for conservative corporate environments and long-form work."
      },
    };
  },

  // Send event to Zapier webhook
  async sendZapierEvent(webhookUrl: string, event: string, data: any) {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        source: "Focal Point CRM",
        data,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn(`Zapier webhook failed for event ${event}:`, response.status, await response.text());
      }
    } catch (error) {
      logger.warn(`Failed to send Zapier event ${event}:`, error);
    }
  },

  // Check if user has Zapier integration enabled for a specific event
  async getZapierIntegration(userId: string, event: string) {
    try {
      const prisma = (await import("../config/prisma")).prisma;
      const integration = await (prisma as any).integration.findFirst({
        where: { userId, id: "zapier", status: "connected" },
      });

      if (!integration?.config?.webhookUrl || !integration?.config?.events?.includes(event)) {
        return null;
      }

      return {
        webhookUrl: integration.config.webhookUrl,
        enabled: true,
      };
    } catch {
      return null;
    }
  },
};
