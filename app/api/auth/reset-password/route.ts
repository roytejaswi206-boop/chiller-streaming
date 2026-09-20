import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return NextResponse.json(
        { error: "Invalid or missing reset token." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Compute SHA-256 hash of incoming token to look up in DB
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Look up valid, unexpired, unused reset token
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset." },
        { status: 400 }
      );
    }

    // Hash new password with bcrypt
    const passwordHash = await hash(password, 10);

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetRecord.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You can now log in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err.message);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
