# Commis — Setup

## 1. Add your Reve API key
```bash
cp .env.local.example .env.local
# edit .env.local and paste your REVE_API_KEY
```

## 2. Run
```bash
npm run dev
# → http://localhost:3000
```

## Pages
- `/` — Landing page (generates hero via Reve on load, interactive demo panel)
- `/commission/demo` — Canvas (click+drag to select regions, type edits, Generate preview)

## Reve API routes
| Route | Reve endpoint |
|---|---|
| `POST /api/reve/generate` | `POST https://api.reve.com/v1/image/create` |
| `POST /api/reve/edit` | `POST https://api.reve.com/v1/image/edit` ← verify at api.reve.com/console/docs/edit |

Response shape: `{ dataUrl: "data:image/png;base64,..." }` — used directly in <img src>.

## Edit endpoint
The create endpoint is confirmed. The edit endpoint (`/v1/image/edit`) follows the same
shape — verify the exact request body fields at:
https://api.reve.com/console/docs/edit

If the field name for the source image differs, update app/api/reve/edit/route.ts.
