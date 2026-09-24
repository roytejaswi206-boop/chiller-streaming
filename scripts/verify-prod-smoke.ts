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

async function fetchWithRetry(url: string, options?: any, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Fetch failed after retries");
}

async function testAdmin(email: string, label: string) {
  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"] || "";

  // Get CSRF
  const csrfRes = await fetchWithRetry("https://streaming-chi-red.vercel.app/api/auth/csrf");
  const csrfCookies = (csrfRes.headers as any).getSetCookie();
  const { csrfToken } = await csrfRes.json();
  const csrfCookieHeader = csrfCookies.map((c: string) => c.split(";")[0]).join("; ");

  // Sign in
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: "https://streaming-chi-red.vercel.app/",
    json: "true",
  });

  const signInRes = await fetchWithRetry("https://streaming-chi-red.vercel.app/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookieHeader,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const setCookies = (signInRes.headers as any).getSetCookie();
  const allCookies = [...csrfCookies, ...setCookies].map((c: string) => c.split(";")[0]).join("; ");

  // Query /api/admin/security
  const secRes = await fetchWithRetry("https://streaming-chi-red.vercel.app/api/admin/security", {
    headers: { Cookie: allCookies },
  });

  const secData = await secRes.json();
  console.log(`[PROD ${label}] (${email}):`);
  console.log(`  Login status: ${signInRes.status}`);
  console.log(`  Security API status: ${secRes.status}`);
  console.log(`  Credential Status: ${secData?.diagnostics?.credentialStatus}`);
  console.log(`  Is Password Configured: ${secData?.diagnostics?.isPasswordConfigured}`);
  console.log(`  Identities:`, secData?.diagnostics?.superAdminEmails);

  return secRes.status === 200 && secData?.diagnostics?.credentialStatus === "SUPER ADMIN CREDENTIAL CONFIGURED";
}

async function testNormalUserDenial() {
  // Query /api/admin/security unauthenticated
  const unauthRes = await fetch("https://streaming-chi-red.vercel.app/api/admin/security");
  console.log(`[PROD NORMAL/UNAUTH DENIAL]:`);
  console.log(`  Unauthenticated /api/admin/security status: ${unauthRes.status} (Expected: 401 or 403)`);
  return unauthRes.status === 401 || unauthRes.status === 403;
}

async function main() {
  const sa1Ok = await testAdmin("roytejaswi40@gmail.com", "SUPER ADMIN #1");
  const sa2Ok = await testAdmin("roytejaswi206@gmail.com", "SUPER ADMIN #2");
  const denialOk = await testNormalUserDenial();

  console.log("\n==================================================");
  console.log(`SUPER ADMIN #1: ${sa1Ok ? "PASS" : "FAIL"}`);
  console.log(`SUPER ADMIN #2: ${sa2Ok ? "PASS" : "FAIL"}`);
  console.log(`UNAUTHENTICATED/NORMAL USER DENIAL: ${denialOk ? "PASS" : "FAIL"}`);
  console.log("==================================================");
}

main().catch(err => {
  console.error("Error running test:", err);
  process.exit(1);
});
