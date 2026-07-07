# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-slim AS build
WORKDIR /app

# package.json + the Prisma schema must both be present before `npm ci`,
# since its postinstall hook runs `prisma generate` (which needs the schema
# file to exist). Copying just these two paths first (rather than the whole
# repo) still preserves Docker layer caching for the common case of editing
# application code without touching dependencies or the schema.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/docs ./docs

EXPOSE 5000
CMD ["node", "dist/server.js"]
