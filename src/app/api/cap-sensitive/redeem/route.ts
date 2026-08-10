import { NextRequest, NextResponse } from "next/server";
import { redeemCap } from "@/lib/cap";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await redeemCap(body, "sensitive");

    if (!result.success) {
      return NextResponse.json(
        { success: false, reason: result.reason },
        { status: 400 },
      );
    }

    const response = NextResponse.json(result);
    response.cookies.set("infvar_cap_sensitive_token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 20 * 60,
    });
    return response;
  } catch (error) {
    console.error("sensitive CAP redeem failed", error);
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}
