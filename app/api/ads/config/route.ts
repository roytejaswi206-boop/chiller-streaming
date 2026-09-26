/**
 * app/api/ads/config/route.ts
 *
 * CHILLER — Centralized Ad Configuration API
 *
 * GET: Public read for client-side ad eligibility evaluation.
 * PATCH: Admin update for toggling switches, providers, and frequency settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdSettings, updateAdSettings } from "@/lib/ads/config";
import { requireAdmin, writeAuditLog, getClientIp } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getAdSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to retrieve ad settings", message: err?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Only authenticated admins can modify ad configuration
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const actorCtx = authResult;

  try {
    const body = await request.json();
    const updated = await updateAdSettings(body);

    const ip = getClientIp(request);
    await writeAuditLog({
      adminEmail: actorCtx.email,
      action: "AD_SETTINGS_UPDATED",
      target: "AD_MONETIZATION_CONFIG",
      details: { updates: body },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to update ad settings", message: err?.message },
      { status: 500 }
    );
  }
}
