import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWebsiteStats } from "@/lib/analytics/queries";

export async function GET(request: NextRequest) {
  const shareId = request.nextUrl.searchParams.get("shareId");
  if (!shareId) {
    return NextResponse.json({ error: "shareId_required" }, { status: 400 });
  }

  const website = await prisma.website.findUnique({
    where: { shareId },
    select: { id: true, name: true, domain: true, isActive: true },
  });

  if (!website || !website.isActive) {
    return NextResponse.json({ error: "share_not_found" }, { status: 404 });
  }

  const days = Math.min(90, Math.max(7, Number(request.nextUrl.searchParams.get("days") ?? "30")));
  const stats = await getWebsiteStats(website.id, days);
  return NextResponse.json({
    website: { name: website.name, domain: website.domain },
    stats,
  });
}
