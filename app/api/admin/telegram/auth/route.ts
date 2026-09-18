import { NextResponse } from "next/server";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { getAuthSession } from "@/lib/auth";
import { getTelegramCredentials, getConnectedTelegramClient } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

// In-memory pending login state for admin session creation
let pendingAuthClient: TelegramClient | null = null;
let pendingPhoneCodeHash: string | null = null;
let pendingPhoneNumber: string | null = null;

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const creds = getTelegramCredentials();

    if (!creds.apiId || !creds.apiHash) {
      return NextResponse.json(
        { error: "TELEGRAM_API_ID and TELEGRAM_API_HASH must be configured in .env first." },
        { status: 400 }
      );
    }

    // 1. Action: SEND_CODE to Telegram phone number
    if (action === "send_code") {
      const { phoneNumber } = body;
      if (!phoneNumber) {
        return NextResponse.json({ error: "Phone number is required (with country code, e.g. +1234567890)" }, { status: 400 });
      }

      const client = new TelegramClient(new StringSession(""), creds.apiId, creds.apiHash, {
        connectionRetries: 5,
        useWSS: false,
      });

      await client.connect();

      const result = await client.sendCode(
        {
          apiId: creds.apiId,
          apiHash: creds.apiHash,
        },
        phoneNumber.trim()
      );

      pendingAuthClient = client;
      pendingPhoneCodeHash = result.phoneCodeHash;
      pendingPhoneNumber = phoneNumber.trim();

      return NextResponse.json({
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        isCodeViaApp: Boolean(result.isCodeViaApp),
        message: "Telegram authorization code dispatched.",
      });
    }

    // 2. Action: SIGN_IN with SMS/Telegram code
    if (action === "sign_in") {
      const { phoneCode, password } = body;

      if (!pendingAuthClient || !pendingPhoneNumber || !pendingPhoneCodeHash) {
        return NextResponse.json(
          { error: "Auth session expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (!phoneCode) {
        return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
      }

      try {
        if (password) {
          await (pendingAuthClient as any).signInWithPassword(
            { apiId: creds.apiId, apiHash: creds.apiHash },
            {
              password: () => Promise.resolve(password.trim()),
              onError: (err: any) => {
                throw err;
              },
            }
          );
        } else {
          await pendingAuthClient.invoke(
            new Api.auth.SignIn({
              phoneNumber: pendingPhoneNumber,
              phoneCodeHash: pendingPhoneCodeHash,
              phoneCode: phoneCode.trim(),
            })
          );
        }

        const stringSession = pendingAuthClient.session.save() as unknown as string;
        const me: any = await pendingAuthClient.getMe();

        // Update current process env
        process.env.TELEGRAM_SESSION = stringSession;

        pendingAuthClient = null;
        pendingPhoneCodeHash = null;
        pendingPhoneNumber = null;

        return NextResponse.json({
          success: true,
          sessionString: stringSession,
          account: {
            id: String(me.id),
            firstName: me.firstName,
            username: me.username,
          },
          message: "Telegram account successfully authorized and session generated!",
        });
      } catch (err: any) {
        if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
          return NextResponse.json({
            requiresPassword: true,
            message: "Two-step verification (2FA password) required for this Telegram account.",
          });
        }
        throw err;
      }
    }

    // 3. Action: SAVE_SESSION_STRING (Direct manual session paste)
    if (action === "save_session") {
      const { sessionString } = body;
      if (!sessionString) {
        return NextResponse.json({ error: "Session string is required." }, { status: 400 });
      }

      process.env.TELEGRAM_SESSION = sessionString.trim();

      // Test the session string
      const client = await getConnectedTelegramClient();
      const me: any = await client.getMe();

      return NextResponse.json({
        success: true,
        account: {
          id: String(me.id),
          firstName: me.firstName,
          username: me.username,
        },
        message: "Telegram session string verified and active!",
      });
    }

    return NextResponse.json({ error: "Invalid auth action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
