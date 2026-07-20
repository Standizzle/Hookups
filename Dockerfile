# Builds the Hookups client (Vite/React) and server (Fastify) into one
# image. The server serves the built client SPA + the /api/* routes from
# a single port — see server/index.js for the static/SPA-fallback wiring.

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

FROM deps AS client-build
COPY client client
RUN npm run build --workspace=client

FROM deps AS server-deps
COPY server server
RUN npx prisma generate --schema=server/prisma/schema.prisma

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-deps /app/server ./server
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
