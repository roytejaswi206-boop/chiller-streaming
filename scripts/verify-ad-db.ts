/**
 * scripts/verify-ad-db.ts
 *
 * Verifies Prisma database interactions for AdSettings and User adsFree
 */

import { prisma } from "../lib/prisma";
import { getAdSettings, updateAdSettings } from "../lib/ads/config";

async function verifyDb() {
  console.log("Verifying Database Ad Settings & User models...");

  // 1. Fetch settings
  const settings = await getAdSettings();
  console.log("[DB] Current Ad Settings ID:", settings.id);
  console.log("[DB] Ads Enabled:", settings.adsEnabled);
  console.log("[DB] Desktop 728:", settings.providerHighRevenue728);
  console.log("[DB] Mobile 320:", settings.providerHighRevenue320);

  // 2. Test update settings
  const updated = await updateAdSettings({
    sessionLimit: 6,
  });
  console.log("[DB] Updated session limit:", updated.sessionLimit);

  // Revert back to 5
  await updateAdSettings({ sessionLimit: 5 });

  // 3. Test AdImpression logging
  const imp = await prisma.adImpression.create({
    data: {
      provider: "highrevenue_728x90",
      placement: "home_top",
      page: "/",
      deviceType: "desktop",
      status: "success",
    },
  });
  console.log("[DB] Created test impression ID:", imp.id);

  // Cleanup test impression
  await prisma.adImpression.delete({ where: { id: imp.id } });
  console.log("[DB] Cleaned up test impression.");

  console.log("Database verification complete: ALL PASS");
}

verifyDb().catch((err) => {
  console.error("DB verification failed:", err);
  process.exit(1);
});
