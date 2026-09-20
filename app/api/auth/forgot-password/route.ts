import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Lookup user quietly without revealing account existence
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      // Invalidate existing unused tokens for this email
      await prisma.passwordResetToken.updateMany({
        where: { email: cleanEmail, used: false },
        data: { used: true },
      });

      // Generate cryptographically secure random 32-byte hex token
      const rawToken = crypto.randomBytes(32).toString("hex");

      // Hash token with SHA-256 for secure database storage
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // 1 hour expiration
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          email: cleanEmail,
          tokenHash,
          expiresAt,
          used: false,
        },
      });

      // Email dispatch integration
      // If an SMTP / transactional email provider is configured, dispatch the link
      if (process.env.SMTP_SERVER && process.env.SMTP_USER) {
        // e.g. sendEmail(...)
      }
    }

    // Always return generic response to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, password reset instructions have been sent.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err.message);
    return NextResponse.json(
      { error: "An error occurred while processing your request. Please try again." },
      { status: 500 }
    );
  }
}
