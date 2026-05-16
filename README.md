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

## Environment

```env
ACCESS_TOKEN=change-me
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=change-me
VITE_API_URL=http://localhost:3000
VITE_ACCESS_TOKEN=change-me
```

## API Documentation

Dokumentasi API lengkap tersedia di:

```txt
/openapi
```
