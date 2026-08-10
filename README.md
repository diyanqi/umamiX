# 无尽分析 Infvar Analytics

Privacy-first, multi-tenant analytics SaaS built with Next.js, Prisma, PostgreSQL and Redis. The platform is designed as a cheaper, more developer-friendly alternative to Umami Cloud.

## Architecture

- Single Next.js application (landing page, dashboard, tracking SDK, REST API)
- Single PostgreSQL database with logical tenant isolation (`tenantId`, `userId`, `projectId` on analytics resources)
- Redis-backed queue for event ingestion and aggregation workers
- `capjs-core` proof-of-work CAPTCHA for registration and login
- GitHub OAuth only, with a 30-day GitHub account age requirement
- Pluggable notification providers (OpenClaw / clawdbot by default)
- OpenAI-compatible AI provider for insights

## Quick start

```bash
cp .env.example .env
# fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AUTH_SECRET, CAP_SECRET
docker compose up --build
```

Open `http://localhost:3000`. The web service applies Prisma migrations and seeds the Free / Pro / Business plans before starting.

## Local development

```bash
pnpm install
docker compose up -d postgres redis
cp .env.example .env
pnpm prisma migrate dev
pnpm db:seed
pnpm dev
pnpm worker
```

## Tracking

```html
<script async src="https://analytics.infvar.com/script.js"
  data-project-id="prj_xxx"
  data-website-id="web_xxx"></script>
```

```js
analytics.track("signup", {
  plan: "pro",
  source: "landing",
});
```

The SDK does not use cookies or fingerprinting. Events are sent to `POST /api/track`, rate limited per IP, validated, and pushed to the BullMQ queue before the aggregation worker writes pageviews, sessions, events, daily metrics and usage records.

## Key endpoints

- `GET /` landing page
- `GET /dashboard` dashboard
- `POST /api/cap/challenge`, `POST /api/cap/redeem` proof-of-work
- `POST /api/track` public tracking ingestion
- `GET /script.js` tracking SDK
- `GET/POST /api/websites` website management
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]` project management
- `GET/POST /api/goals`, `DELETE /api/goals/[id]` conversion goals
- `POST /api/reports/[id]/run` executable funnel, retention, UTM, journey, attribution reports
- `GET /api/stats?websiteId=...&days=30` analytics
- `GET /api/public/stats?shareId=...` public shared reports
- `GET /api/events/properties?websiteId=...&name=...` event property analysis
- `GET/POST/DELETE /api/api-keys` API key management
- `GET/POST /api/team` team membership management
- `PUT /api/subscription` plan switching
- `POST /api/billing/checkout` plan checkout through the configured billing provider
- `POST /api/billing/webhook` provider webhook for completed payments
- `POST /api/ai/insights` AI summaries
- `PUT /api/notifications/settings` notification configuration
- `GET /api/health` database/Redis readiness for monitoring

Every website has a shareable report URL at `/share/{shareId}`.
Team invitations are issued through `/api/team/invitations`; invited GitHub users can accept at `/invite/{token}` and new registrations with a matching GitHub login are joined automatically.

Billing defaults to a `mock` provider so the platform works self-hosted without payment infrastructure. Set `BILLING_PROVIDER=yipay` and configure `YIPAY_GATEWAY_URL`, `YIPAY_PID`, `YIPAY_KEY` and `YIPAY_TYPE` to route plan purchases through the 易支付 gateway. The async notify callback is handled at `/api/billing/webhook` with MD5 signature verification.

## Instance URLs

Every project can be addressed through its slug with the instance URL scheme:

```
/i/{project-slug}/dashboard
/i/{project-slug}/websites
/i/{project-slug}/dashboard/websites
/i/{project-slug}/script.js
/i/{project-slug}/share/{shareId}
```

The proxy rewrites these paths to the normal app and scopes the dashboard to that project. A reverse proxy can map `https://{instance}.analytics.infvar.com/` to the same app when wildcard subdomains are enabled.

## Deployment

`docker-compose.prod.yml` deploys `web`, `worker` and `redis` and expects PostgreSQL to be managed externally on the server (or by your hosting provider). Set `DATABASE_URL` in `.env` to that database, point `APP_URL` at your domain, and terminate TLS with a reverse proxy such as Caddy or Traefik. The web service applies Prisma migrations and seeds the plans on startup.

If migration fails with `type "OrgRole" does not exist`, the target database has stale or partial migration state. Point `DATABASE_URL` at a fresh database, or clear the old schema, then start again.

## Plans

Plans are stored in PostgreSQL and seeded from `prisma/seed.ts`: Free, Pro (¥29/month) and Business (¥99/month). Limits control website count, event/pageview volume, retention, reports, API access, AI features and team size.

## Security

- GitHub OAuth with CAP proof-of-work and account age verification
- Tenant scoped access checks on every dashboard/API resource
- Input validation with Zod
- Rate limiting on tracking ingestion
- Hashed API keys, HTTP-only session cookies, security headers
- No cookies or fingerprinting in the tracking SDK
