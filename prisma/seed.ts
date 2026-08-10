import "@/lib/env";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type PlanSeed = {
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  sortOrder: number;
  limits: Prisma.InputJsonValue;
  features: Prisma.InputJsonValue;
};

const plans: PlanSeed[] = [
  {
    code: "free",
    name: "Free",
    description: "For personal developers getting started",
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 0,
    limits: {
      websites: 3,
      eventsPerMonth: 100000,
      pageviewsPerMonth: 500000,
      retentionDays: 30,
      reports: 2,
      apiAccess: false,
      aiInsights: false,
      teamMembers: 1,
      advancedReports: false,
    },
    features: ["3 websites", "Basic analytics", "30 day retention", "Basic events", "2 standard reports"],
  },
  {
    code: "pro",
    name: "Pro",
    description: "For developers and small teams",
    priceMonthly: 2900,
    priceYearly: 29000,
    sortOrder: 1,
    limits: {
      websites: 50,
      eventsPerMonth: 5000000,
      pageviewsPerMonth: 20000000,
      retentionDays: 180,
      reports: 20,
      apiAccess: true,
      aiInsights: true,
      teamMembers: 5,
      advancedReports: true,
    },
    features: ["50 websites", "Unlimited events", "180 day retention", "API access", "Advanced reports", "AI insights"],
  },
  {
    code: "business",
    name: "Business",
    description: "For companies with larger traffic",
    priceMonthly: 9900,
    priceYearly: 99000,
    sortOrder: 2,
    limits: {
      websites: 999,
      eventsPerMonth: 50000000,
      pageviewsPerMonth: 100000000,
      retentionDays: 365,
      reports: 200,
      apiAccess: true,
      aiInsights: true,
      teamMembers: 50,
      advancedReports: true,
    },
    features: ["Unlimited websites", "Team members", "Advanced permissions", "Priority resources", "Larger quotas"],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${plans.length} plans`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
