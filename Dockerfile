# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock tsconfig.json biome.json vite.config.ts ./
RUN bun install --frozen-lockfile

COPY index.ts ./
COPY controllers ./controllers
COPY lib ./lib
COPY plugins ./plugins
COPY services ./services
COPY utils ./utils
COPY panel ./panel

ARG VITE_API_URL=http://localhost:3000
ARG VITE_PANEL_ACCESS=
RUN VITE_API_URL="$VITE_API_URL" VITE_ACCESS_TOKEN="$VITE_PANEL_ACCESS" bun run build:all

FROM debian:bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/credentials /app/db /app/logs

COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["./server"]
