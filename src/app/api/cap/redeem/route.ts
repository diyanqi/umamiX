import { NextRequest, NextResponse } from "next/server";
import { redeemCap } from "@/lib/cap";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await redeemCap(body, "auth");

    if (!result.success) {
      return NextResponse.json(
        { success: false, reason: result.reason },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("CAP redeem failed", error);
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}
