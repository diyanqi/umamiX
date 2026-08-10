import { prisma } from "./prisma";

export async function getUserOrganizationIds(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return memberships.map((membership) => membership.organizationId);
}

export async function getUserProjectIds(userId: string) {
  const organizationIds = await getUserOrganizationIds(userId);
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { id: true },
  });
  return new Set(projects.map((project) => project.id));
}

export async function assertProjectAccess(userId: string, projectId: string) {
  const projectIds = await getUserProjectIds(userId);
  if (!projectIds.has(projectId)) {
    throw new Error("project_not_found");
  }
}

export async function assertWebsiteAccess(userId: string, websiteId: string) {
  const projectIds = await getUserProjectIds(userId);
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { projectId: true },
  });
  if (!website || !projectIds.has(website.projectId)) {
    throw new Error("website_not_found");
  }
}
