import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { logger } from "@/lib/logger";

let activeClient: TelegramClient | null = null;
let lastConnectionStatus: {
  status: "CONNECTED" | "DISCONNECTED" | "NOT_CONFIGURED" | "SETUP_REQUIRED" | "ERROR";
  account?: {
    id: string;
    firstName: string;
    username?: string;
    phone?: string;
    isBot: boolean;
  };
  lastConnectedAt?: string;
  lastError?: string;
} = {
  status: "NOT_CONFIGURED",
};

export function getTelegramCredentials() {
  const apiIdStr = process.env.TELEGRAM_API_ID?.trim();
  const apiId = apiIdStr ? parseInt(apiIdStr, 10) : 0;
  const apiHash = process.env.TELEGRAM_API_HASH?.trim() || "";
  const sessionString = process.env.TELEGRAM_SESSION?.trim() || "";
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";

  return {
    apiId,
    apiHash,
    sessionString,
    botToken,
    isConfigured: Boolean(apiId && apiHash),
    hasAuth: Boolean(sessionString || botToken),
  };
}

/**
 * Get or create a connected TelegramClient singleton.
 */
export async function getConnectedTelegramClient(): Promise<TelegramClient> {
  const creds = getTelegramCredentials();

  if (!creds.isConfigured) {
    lastConnectionStatus = {
      status: "NOT_CONFIGURED",
      lastError: "TELEGRAM_API_ID and TELEGRAM_API_HASH are not set in environment.",
    };
    throw new Error(lastConnectionStatus.lastError);
  }

  if (!creds.hasAuth) {
    lastConnectionStatus = {
      status: "SETUP_REQUIRED",
      lastError: "TELEGRAM_SESSION or TELEGRAM_BOT_TOKEN required. Authenticate in /admin/telegram.",
    };
    throw new Error(lastConnectionStatus.lastError);
  }

  // Return existing connected client if available
  if (activeClient && activeClient.connected) {
    return activeClient;
  }

  const stringSession = new StringSession(creds.sessionString);
  const client = new TelegramClient(stringSession, creds.apiId, creds.apiHash, {
    connectionRetries: 5,
    useWSS: false,
  });

  try {
    if (creds.botToken && !creds.sessionString) {
      await client.start({
        botAuthToken: creds.botToken,
      });
    } else {
      await client.connect();
    }

    const me: any = await client.getMe();
    if (!me) {
      throw new Error("Unable to retrieve authenticated Telegram entity.");
    }

    activeClient = client;
    lastConnectionStatus = {
      status: "CONNECTED",
      account: {
        id: String(me.id),
        firstName: me.firstName || me.title || "Telegram Account",
        username: me.username || undefined,
        phone: me.phone || undefined,
        isBot: Boolean(me.bot),
      },
      lastConnectedAt: new Date().toISOString(),
    };

    logger.info("TELEGRAM", `Connected to Telegram as ${me.firstName} (@${me.username || "no-username"})`);
    return client;
  } catch (err: any) {
    lastConnectionStatus = {
      status: "ERROR",
      lastError: err.message || "Failed to establish Telegram MTProto connection.",
    };
    logger.error("TELEGRAM", `Connection failed: ${err.message}`);
    throw err;
  }
}

/**
 * Inspect Telegram connection status safely without leaking secrets.
 */
export async function getTelegramStatus(forceRefresh = false) {
  const creds = getTelegramCredentials();

  if (!creds.isConfigured) {
    return {
      status: "NOT_CONFIGURED" as const,
      hasApiId: false,
      hasApiHash: false,
      hasSession: false,
      hasBotToken: false,
      message: "TELEGRAM_API_ID and TELEGRAM_API_HASH must be configured in environment variables.",
    };
  }

  if (!creds.hasAuth) {
    return {
      status: "SETUP_REQUIRED" as const,
      hasApiId: true,
      hasApiHash: true,
      hasSession: false,
      hasBotToken: false,
      message: "API credentials set, but user session or bot token is required.",
    };
  }

  if (forceRefresh || lastConnectionStatus.status !== "CONNECTED") {
    try {
      await getConnectedTelegramClient();
    } catch {
      // Handled in lastConnectionStatus
    }
  }

  return {
    ...lastConnectionStatus,
    hasApiId: true,
    hasApiHash: true,
    hasSession: Boolean(creds.sessionString),
    hasBotToken: Boolean(creds.botToken),
  };
}

export interface TelegramSourceOption {
  id: string;
  title: string;
  username?: string;
  type: "SAVED_MESSAGES" | "CHANNEL" | "GROUP" | "CHAT";
  unreadCount: number;
}

/**
 * List all authorized Telegram sources accessible to the account.
 */
export async function listAuthorizedSources(): Promise<TelegramSourceOption[]> {
  const client = await getConnectedTelegramClient();
  const sources: TelegramSourceOption[] = [];

  // 1. Saved Messages is always available for authorized user sessions
  if (!lastConnectionStatus.account?.isBot) {
    sources.push({
      id: "me",
      title: "Saved Messages (Private Cloud)",
      type: "SAVED_MESSAGES",
      unreadCount: 0,
    });
  }

  // 2. Fetch dialogs from Telegram API
  try {
    const dialogs = await client.getDialogs({ limit: 100 });

    for (const d of dialogs) {
      const entity: any = d.entity;
      if (!entity) continue;

      const isChannel = Boolean(d.isChannel);
      const isGroup = Boolean(d.isGroup);

      // We only include channels, groups, and direct chats with media
      sources.push({
        id: String(d.id),
        title: d.title || d.name || "Untitled Chat",
        username: entity.username || undefined,
        type: isChannel ? "CHANNEL" : isGroup ? "GROUP" : "CHAT",
        unreadCount: d.unreadCount || 0,
      });
    }
  } catch (err: any) {
    logger.error("TELEGRAM", `Failed to list dialogs: ${err.message}`);
  }

  return sources;
}
