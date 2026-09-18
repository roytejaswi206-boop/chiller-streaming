import { prisma } from "@/lib/prisma";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";
export type ServiceName =
  | "API"
  | "QUEUE"
  | "TRANSCODER"
  | "ORIGIN"
  | "REPLICATION"
  | "TELEGRAM"
  | "TELEGRAM_DOWNLOADER"
  | "TELEGRAM_IMPORTER"
  | "TELEGRAM_SCANNER"
  | "AUTH"
  | "PLAYER"
  | "IMPORT"
  | "STORAGE";

export async function logEvent(
  level: LogLevel,
  service: ServiceName,
  message: string,
  metadata?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${service}]: ${message}`, metadata ? JSON.stringify(metadata) : "");

  try {
    await prisma.systemLog.create({
      data: {
        level,
        service,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error("Failed to write system log to DB:", err);
  }
}

export const logger = {
  info: (service: ServiceName, message: string, metadata?: Record<string, unknown>) =>
    logEvent("INFO", service, message, metadata),
  warn: (service: ServiceName, message: string, metadata?: Record<string, unknown>) =>
    logEvent("WARN", service, message, metadata),
  error: (service: ServiceName, message: string, metadata?: Record<string, unknown>) =>
    logEvent("ERROR", service, message, metadata),
  fatal: (service: ServiceName, message: string, metadata?: Record<string, unknown>) =>
    logEvent("FATAL", service, message, metadata),
};
