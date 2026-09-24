# CivicTrack — Neighbourhood Civic Infrastructure Mapping & Reporting

Working MVP: submission form, map view, dashboard. Verified end-to-end (backend API
tested with curl, frontend builds clean with Vite) before this was handed to you.

## What's actually built

- **Report tab** — pick a category, write a description, get your GPS location (or
  tap the map to place/correct the pin), optionally attach a photo, submit.
- **Map tab** — every report as a color-coded pin, filterable by category, click a
  pin to see details and change its status (pending → verified → resolved/rejected).
- **Dashboard tab** — total counts, status breakdown, flagged count, and a bar
  chart of issues by category (recharts).

Backend: Express + SQLite (Node's built-in `node:sqlite` — no native compile step,
no Visual Studio required), photo uploads via multer, stored on disk.
Frontend: React + Vite, Leaflet/OpenStreetMap for maps, recharts for the dashboard.

## Fake-report filtering — what it does and its real limits

No system can prove a report is genuine short of physically checking the site.
What's built here is heuristic filtering, the same category of thing real
platforms (Google Maps reports, city 311 systems) use — not certainty, but a
real reduction in the easy, common fakes:

- **Geofence** (`backend/config.js` → `GEOFENCE`) — submissions outside the
  bounding box are rejected outright. Currently set to the whole Mumbai
  Metropolitan Region since the CEP proposal's locality field is still a
  placeholder — narrow it once you've picked your actual survey area.
- **Rate limiting** — 10 submissions per 15 minutes per IP. Stops trivial bot
  flooding, not a determined attacker with a VPN.
- **Duplicate corroboration** — a new report of the same category within 40m
  and 14 days of an existing one doesn't create a second row; it increments
  that report's `confirmations` count instead. Hit 3 confirmations and it
  auto-promotes from `pending` to `verified` — crowd consensus standing in
  for a human moderator you don't have staffed full-time.
- **Photo GPS cross-check** — if a photo's embedded EXIF GPS disagrees with
  the pinned location by more than 1km, the report is flagged (shown with a
  black outline on the map and a warning in the popup) for manual review.
  Absence of EXIF GPS is NOT flagged — most phones strip it by default, so
  that alone means nothing.
- **Admin-gated moderation** — status changes and deletes require an admin
  key sent in the `x-admin-key` header. Set a real value via the `ADMIN_KEY`
  environment variable before this runs anywhere but your own machine. In
  local development, an omitted key uses a clearly named development-only
  value and prints a warning; in production (`NODE_ENV=production`), startup
  fails unless `ADMIN_KEY` is explicitly set. In the frontend, enter the key
  once in the Map tab; it's saved to that browser's localStorage.

For local development, the easy admin key is `civic123`. This key is only a
convenience for local demos and must not be used in a public deployment.

None of this replaces a human periodically reviewing flagged/pending reports.
It reduces how much garbage reaches that human, nothing more.

## Run it

Two terminals, both from a fresh clone:

```bash
# Terminal 1 — backend
cd backend
npm install
ADMIN_KEY=pick-a-real-secret npm start
# → CivicTrack backend running on http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# → open the printed http://localhost:5173 URL
```

On Windows PowerShell, setting the env var inline looks like:
```powershell
$env:ADMIN_KEY="pick-a-real-secret"; npm start
```

The Vite dev server proxies `/api` and `/uploads` to port 4000 (see
`frontend/vite.config.js`), so you don't need CORS workarounds in dev.

The SQLite file (`backend/civictrack.db`) and any uploaded photos are created
automatically on first run — nothing to seed manually. Photos are limited to
JPEG, PNG, and WebP files up to 8MB. Delete `civictrack.db` (and its `-wal`/
`-shm` sidecar files if present) to reset all data.

## Public deployment

The recommended public setup is a Vercel frontend and a Render backend with a
persistent disk. The persistent disk is important because SQLite and uploaded
photos live under `backend/`; without it, a restart or redeploy can erase data.

### Deploy the backend to Render

1. Push this repository to GitHub.
2. In Render, create a Blueprint from the repository. Render will detect
   `render.yaml`.
3. Set `FRONTEND_ORIGIN` to the final Vercel URL.
4. Keep the generated `ADMIN_KEY` secret.
5. Confirm the deployed URL responds at `/api/health`.

This setup requires a Render plan that supports persistent disks. Do not use
an ephemeral/free backend for real submissions.

### Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Set the project root directory to `frontend`.
3. Set `VITE_API_URL` to the deployed Render backend URL, without a trailing
   slash, for example `https://civictrack-api.onrender.com`.
4. Deploy and open the generated Vercel URL.
5. Set that URL as Render's `FRONTEND_ORIGIN`, then redeploy the backend.

The frontend uses `/api` automatically in local development and uses
`VITE_API_URL` in production. CORS is restricted to the configured frontend
origin when `FRONTEND_ORIGIN` is set.

## What's NOT built yet — do this next, in order

1. **Status workflow polish** — status changes currently happen straight from the
   map popup with no auth. Fine for a single-team demo. If you want any access
   control before verified/resolved can be set, add it here.
2. **Deployment** — this only runs on localhost right now. Decide: Vercel
   (frontend) + Render/Railway (backend). SQLite doesn't survive most free-tier
   redeploys/restarts — if you deploy, either pick a host with a persistent disk
   or migrate to Postgres before you rely on uploaded data surviving a redeploy.
3. **Real field data** — go collect it using the Report tab itself, from your own
   phones, on your actual visits. That's your dataset AND your first real usability
   test in one pass.
4. **Report/testing tasks for the rest of the team** — they don't need to touch
   this code to be useful. Fieldwork, filling out reports on-site, testing on
   their own phones and filing bugs, and writing the CEP report sections are all
   real contributions that need zero React knowledge.

## Known rough edges (not bugs, just not done)

- No pagination — fine until you have hundreds of reports.
- No duplicate/spam detection — irrelevant if only your team is submitting.
- Multer photo upload allows any image type/size up to 8MB — tighten later if
  needed, not a priority now.
