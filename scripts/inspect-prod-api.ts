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

async function inspectProdApi() {
  const env = parseEnvFile(path.join(process.cwd(), ".env"));
  const password = env["SUPER_ADMIN_BOOTSTRAP_PASSWORD"] || "";
  const email = "roytejaswi40@gmail.com";

  // Get CSRF token
  const csrfRes = await fetch("https://streaming-chi-red.vercel.app/api/auth/csrf");
  const csrfCookies = (csrfRes.headers as any).getSetCookie ? (csrfRes.headers as any).getSetCookie() : [csrfRes.headers.get("set-cookie")];
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

  const signInRes = await fetch("https://streaming-chi-red.vercel.app/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookieHeader,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const setCookies = (signInRes.headers as any).getSetCookie ? (signInRes.headers as any).getSetCookie() : [signInRes.headers.get("set-cookie")];
  console.log("Set-Cookies returned from login:", setCookies.map((c: string) => c.split(";")[0]));

  const allCookies = [...csrfCookies, ...setCookies].map((c: string) => c.split(";")[0]).join("; ");

  // Fetch /api/admin/security
  const secRes = await fetch("https://streaming-chi-red.vercel.app/api/admin/security", {
    headers: {
      Cookie: allCookies,
    },
  });

  console.log("/api/admin/security status:", secRes.status);
  const secData = await secRes.json();
  console.log("/api/admin/security result:", {
    authorizedEmails: secData.authorizedEmails,
    diagnostics: secData.diagnostics,
    recentAlertsCount: secData.recentAlerts?.length,
  });
}

inspectProdApi().catch(err => console.error(err));
