FROM node:24-alpine AS base

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG AUTH_SECRET=build-only-secret
ARG CAP_SECRET=build-only-cap-secret
ARG GITHUB_CLIENT_ID=build-only
ARG GITHUB_CLIENT_SECRET=build-only
ARG DATABASE_URL=postgresql://infvar:infvar@postgres:5432/infvar
ENV AUTH_SECRET=$AUTH_SECRET
ENV CAP_SECRET=$CAP_SECRET
ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm prisma generate && pnpm next build

EXPOSE 3000

CMD ["pnpm", "start"]
