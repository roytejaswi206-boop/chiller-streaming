import { NextResponse } from "next/server";
import { testCodeSpecterConnection } from "@/lib/codespecters/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const customKey = body.key?.trim();
    const result = await testCodeSpecterConnection(customKey);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
