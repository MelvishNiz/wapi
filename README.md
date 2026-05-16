# wapi

WAPI is a REST API for sending and receiving WhatsApp messages built on [Bun](https://bun.sh) and the [Elysia](https://elysiajs.com) framework. It exposes a simple HTTP interface and includes a lightweight web panel for managing connections.

## Prerequisites

- Bun v1.2.15 or later

## Getting started

1. Install dependencies

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and adjust the values

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | -------- | ----------- |
   | `ACCESS_TOKEN` | Token used by the API for authentication |
   | `BASIC_AUTH_USER` | Username for the control panel |
   | `BASIC_AUTH_PASS` | Password for the control panel |

3. Start the development server

   ```bash
   bun run dev
   # or
   bun run index.ts
   ```

   The API is available at `http://localhost:3000`.

## Available scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Start API in development mode |
| `bun run dev:watch` | Start API with file watching |
| `bun run build` | Build a standalone server binary |
| `bun run build:panel` | Build the Vue panel |
| `bun run build:all` | Build server and panel |
| `bun run start` | Run the compiled server |

## Notes

This project was created using `bun init` in bun v1.2.15.
