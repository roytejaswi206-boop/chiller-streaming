import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

async function addVercelEnv(name: string, value: string, envTarget: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Pipe value via stdin
    const child = spawn("npx", ["vercel", "env", "add", name, envTarget, "--force", "-y"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    let stderr = "";
    child.stdin.write(value);
    child.stdin.end();

    child.stdout.on("data", () => {
      // Intentionally suppress stdout so no sensitive metadata is exposed
    });

    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[VERCEL SYNC] Variable ${name} added to ${envTarget} successfully.`);
        resolve(true);
      } else {
        console.error(`[VERCEL SYNC ERROR] Failed to add ${name}: ${stderr.trim()}`);
        resolve(false);
      }
    });
  });
}

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Local .env not found.");
    process.exit(1);
  }

  const env = parseEnvFile(envPath);
  const emails = env["SUPER_ADMIN_EMAILS"];
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"];

  if (!emails || !password) {
    console.error("Missing SUPER_ADMIN_EMAILS or SUPER_ADMIN_BOOTSTRAP_PASSWORD in local .env");
    process.exit(1);
  }

  console.log("SUPER ADMIN CREDENTIAL CONFIGURED LOCALLY. Syncing to Vercel production...");

  // Sync to production and preview
  await addVercelEnv("SUPER_ADMIN_EMAILS", emails, "production");
  await addVercelEnv("SUPER_ADMIN_BOOTSTRAP_PASSWORD", password, "production");
  await addVercelEnv("SUPER_ADMIN_EMAILS", emails, "preview");
  await addVercelEnv("SUPER_ADMIN_BOOTSTRAP_PASSWORD", password, "preview");

  console.log("Sync complete. Vercel environment updated.");
}

main().catch(err => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
