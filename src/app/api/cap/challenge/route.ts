import { NextResponse } from "next/server";
import { createCapChallenge } from "@/lib/cap";

export async function POST() {
  try {
    const challenge = await createCapChallenge("auth");
    return NextResponse.json(challenge);
  } catch (error) {
    console.error("CAP challenge failed", error);
    return NextResponse.json({ error: "challenge_failed" }, { status: 500 });
  }
}
