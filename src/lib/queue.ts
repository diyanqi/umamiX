import { Queue } from "bullmq";
import { redis } from "./redis";

export type TrackPayload = {
  type: "pageview" | "event";
  projectId: string;
  websiteId?: string;
  path: string;
  url?: string;
  title?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  name?: string;
  properties?: Record<string, unknown>;
  language?: string;
  screen?: string;
  timezone?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  receivedAt?: number;
};

const globalForQueue = globalThis as unknown as { analyticsQueue?: Queue };

export function getAnalyticsQueue() {
  if (!globalForQueue.analyticsQueue) {
    globalForQueue.analyticsQueue = new Queue("analytics-events", {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 5000,
        removeOnFail: 5000,
      },
    });
  }
  return globalForQueue.analyticsQueue;
}
