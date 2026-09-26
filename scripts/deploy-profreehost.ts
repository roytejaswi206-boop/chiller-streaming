/**
 * CHILLER PROFREEHOST AUTOMATED FTP DEPLOYMENT ENGINE
 * Reads configuration securely from environment variables.
 * Uploads production distribution package from profreehost_dist/ to remote /htdocs.
 * Never prints passwords or commits sensitive credentials.
 */

import * as ftp from "basic-ftp";
import path from "path";
import fs from "fs";

async function deployToProFreeHost() {
  const host = process.env.PROFREEHOST_FTP_HOST || "ftpupload.net";
  const user = process.env.PROFREEHOST_FTP_USER;
  const password = process.env.PROFREEHOST_FTP_PASSWORD;
  const remotePath = process.env.PROFREEHOST_FTP_PATH || "/htdocs";
  const localDist = path.join(process.cwd(), "profreehost_dist");

  console.log("=== CHILLER PROFREEHOST DEPLOYMENT ===");
  console.log(`Target Host: ${host}`);
  console.log(`Target Remote Path: ${remotePath}`);
  console.log(`Local Distribution Directory: ${localDist}`);

  if (!fs.existsSync(localDist)) {
    throw new Error(`Distribution directory not found at ${localDist}. Please run build first!`);
  }

  if (!user || !password) {
    console.error("\n[ERROR] Missing ProFreeHost FTP credentials.");
    console.error("Please ensure the following environment variables are set in .env.local:");
    console.error("  PROFREEHOST_FTP_HOST=ftpupload.net");
    console.error("  PROFREEHOST_FTP_USER=<your unaux_xxxx username>");
    console.error("  PROFREEHOST_FTP_PASSWORD=<your account password>");
    console.error("  PROFREEHOST_FTP_PATH=/htdocs\n");
    process.exit(1);
  }

  const client = new ftp.Client();
  client.ftp.verbose = false; // Do not leak credentials or raw transcripts

  try {
    console.log(`\nConnecting to ${host} as user ${user}...`);
    await client.access({
      host,
      user,
      password,
      port: 21,
      secure: false, // Standard FTP with TLS fallback supported by ProFreeHost
    });
    console.log("✓ Connected and authenticated successfully!");

    console.log(`Navigating to remote directory: ${remotePath}...`);
    await client.ensureDir(remotePath);

    console.log("Uploading files from profreehost_dist/ to ProFreeHost /htdocs...");
    await client.uploadFromDir(localDist, remotePath);

    console.log("✓ All files uploaded successfully to ProFreeHost!");
    console.log("=== DEPLOYMENT COMPLETE ===\n");
    console.log("Verify live at: https://chillerstream.unaux.com");
  } catch (err: any) {
    console.error("Deployment failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deployToProFreeHost();
