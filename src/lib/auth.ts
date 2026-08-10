import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifyCapToken } from "./cap";

const GITHUB_ACCOUNT_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getGitHubAgeDays(createdAt?: string | Date | null): number | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: String(profile.id),
          githubId: String(profile.id),
          githubLogin: profile.login,
          githubCreatedAt: profile.created_at
            ? new Date(profile.created_at)
            : undefined,
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
        } as never;
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const cookieStore = await cookies();
      const capToken = cookieStore.get("infvar_cap_token")?.value;

      if (!capToken || !(await verifyCapToken(capToken))) {
        return false;
      }

      cookieStore.delete("infvar_cap_token");

      const rawCreatedAt = (
        profile as Record<string, unknown> | undefined
      )?.created_at;
      const ageDays = getGitHubAgeDays(rawCreatedAt as string | undefined);
      if (ageDays !== null && ageDays < 30) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const extended = user as typeof user & {
          tenantId?: string;
          githubLogin?: string;
        };
        token.tenantId = extended.tenantId;
        token.githubLogin = extended.githubLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const extended = session.user as unknown as Record<string, unknown>;
        extended.id = token.sub;
        extended.tenantId = token.tenantId;
        extended.githubLogin = token.githubLogin;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const userId = user.id;
      if (!userId) return;

      const extended = user as typeof user & {
        tenantId?: string;
        githubLogin?: string;
        githubCreatedAt?: Date | null;
      };

      const tenantId = extended.tenantId ?? `tnt_${userId.slice(0, 10)}`;
      const slug = `org_${userId.slice(0, 12)}`;

      const organization = await prisma.organization.create({
        data: {
          tenantId,
          name: `${extended.githubLogin ?? user.name ?? "My"} workspace`,
          slug,
          ownerId: userId,
        },
      });

      await prisma.membership.create({
        data: {
          tenantId,
          userId,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      const project = await prisma.project.create({
        data: {
          tenantId,
          userId,
          organizationId: organization.id,
          name: "Main project",
          slug: "main",
          description: "Default analytics project",
        },
      });

      const freePlan = await prisma.plan.findUnique({ where: { code: "free" } });
      if (freePlan) {
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await prisma.subscription.create({
          data: {
            tenantId,
            userId: user.id!,
            organizationId: organization.id,
            projectId: project.id,
            planId: freePlan.id,
            status: "ACTIVE",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      if (extended.githubLogin) {
        const pendingInvites = await prisma.invitation.findMany({
          where: {
            githubLogin: { equals: extended.githubLogin, mode: "insensitive" },
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            organizationId: true,
            role: true,
            tenantId: true,
          },
        });

        for (const invite of pendingInvites) {
          await prisma.membership.upsert({
            where: {
              organizationId_userId: {
                organizationId: invite.organizationId,
                userId,
              },
            },
            update: {},
            create: {
              tenantId: invite.tenantId,
              userId,
              organizationId: invite.organizationId,
              role: invite.role,
            },
          });
          await prisma.invitation.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED", acceptedAt: new Date() },
          });
        }
      }
    },
  },
});
