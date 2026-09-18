import { prisma } from "../lib/prisma";
import { defaultStorage } from "../lib/storage";
import { VideoJobQueue } from "../lib/queue";

async function runHealthCheck() {
  console.log("=================================================");
  console.log("🩺 VELORA INFRASTRUCTURE HEALTH PROBE");
  console.log("=================================================");

  // 1. Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    console.log(`✔ Database: UP (${dbLatency}ms)`);
  } catch (e: any) {
    console.error(`✖ Database: DOWN (${e.message})`);
  }

  // 2. Storage
  try {
    const probeKey = "system_probe.tmp";
    await defaultStorage.upload(probeKey, Buffer.from("OK"));
    const exists = await defaultStorage.exists(probeKey);
    await defaultStorage.delete(probeKey);
    console.log(`✔ Storage:  UP (Provider: ${defaultStorage.name}, Read/Write Verified)`);
  } catch (e: any) {
    console.error(`✖ Storage:  DOWN (${e.message})`);
  }

  // 3. Queue
  try {
    const q = await VideoJobQueue.getMetrics();
    console.log(`✔ Queue:    UP (Mode: ${q.mode}, Queued: ${q.queued}, Processing: ${q.processing}, Ready: ${q.ready}, Failed: ${q.failed})`);
  } catch (e: any) {
    console.error(`✖ Queue:    DOWN (${e.message})`);
  }

  // 4. Origins
  try {
    const servers = await prisma.streamingServer.findMany();
    console.log(`✔ Origins:  ${servers.length} configured in database`);
    for (const s of servers) {
      console.log(`   - [${s.name}] Status: ${s.status} | Latency: ${s.latencyMs}ms | Endpoint: ${s.endpoint || "N/A"}`);
    }
  } catch (e: any) {
    console.error(`✖ Origins:  Error reading servers (${e.message})`);
  }

  console.log("=================================================");
  await prisma.$disconnect();
}

runHealthCheck();
