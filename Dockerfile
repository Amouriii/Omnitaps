# Debian slim (not Alpine) so Prisma can use OpenSSL binaries.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Schema is copied in the build stage; skip Prisma postinstall here.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM node:22-bookworm-slim AS runner
LABEL org.opencontainers.image.source=https://github.com/onouh/Omnitaps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npx prisma generate

COPY --from=build /app/dist ./dist
COPY api ./api
COPY app ./app
COPY lib ./lib
COPY db ./db
COPY scripts/docker-server.mjs ./scripts/docker-server.mjs

RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
