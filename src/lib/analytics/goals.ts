import { GoalOperator, GoalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPeriodRange } from "@/lib/utils";

export async function getGoalConversions(
  goal: {
    id: string;
    websiteId: string;
    type: GoalType;
    value: string;
    operator: GoalOperator;
  },
  days = 30,
) {
  const { start, end } = getPeriodRange(days);
  const where: Prisma.EventWhereInput | Prisma.PageviewWhereInput = {
    websiteId: goal.websiteId,
    timestamp: { gte: start, lte: end },
  };

  const match =
    goal.operator === "EXACT"
      ? { equals: goal.value }
      : goal.operator === "CONTAINS"
        ? { contains: goal.value }
        : { regex: goal.value };

  if (goal.type === "EVENT") {
    const count = await prisma.event.count({
      where: { ...(where as Prisma.EventWhereInput), name: match },
    });
    return { count };
  }

  const count = await prisma.pageview.count({
    where: { ...(where as Prisma.PageviewWhereInput), path: match },
  });
  return { count };
}
