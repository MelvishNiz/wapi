# WAPI

WhatsApp API gateway dengan web panel dan bot command group dinamis.

## Development

```bash
bun install
cp .env.example .env
bun run dev
```

URL:

```txt
API          http://localhost:3000
Panel        http://localhost:3000/panel
Bot Command  http://localhost:3000/bot-commands
API Docs     http://localhost:3000/openapi
```

## Production

Build server dan panel:

```bash
bun install --production
bun run build:all
```

Run:

```bash
bun run start
```

## Docker

Local build dari source:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Production pakai image dari GitHub Container Registry:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Default image production:

```txt
ghcr.io/melvishniz/wapi:latest
```

Jika ingin pakai tag tertentu:

```bash
WAPI_IMAGE=ghcr.io/melvishniz/wapi:1.2.3 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Data runtime disimpan di folder lokal:

```txt
credentials/
db/
logs/
```

## Environment

```env
ACCESS_TOKEN=change-me
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=change-me
VITE_API_URL=http://localhost:3000
PANEL_API_URL=http://localhost:3000 # opsional untuk Docker image production
```

Panel dilindungi `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`. `ACCESS_TOKEN` hanya dipakai backend untuk public API dan tidak dikirim ke browser.

## Release & Docker Image

Release otomatis berjalan saat push ke `main` memakai semantic-release. Gunakan Conventional Commits, contoh:

```txt
feat: add command webhook params
fix: handle empty webhook response
```

Docker image otomatis dibuat oleh GitHub Actions untuk branch, PR, dan tag release ke:

```txt
ghcr.io/<owner>/<repo>
```

## API Documentation

Dokumentasi API lengkap tersedia di:

```txt
/openapi
```
