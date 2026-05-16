# Deployment Guide — Vercel + Railway

**Architecture:**
- **Vercel** — Next.js frontend
- **Railway** — FastAPI backend + combined workers (supervisord) + Redis addon
- **Supabase** — Postgres + Auth + Storage (external, already running)

---

## Prerequisites

- GitHub repo pushed and accessible
- Supabase project created and running (DB, Auth, Storage bucket `invoices`)
- OpenAI API key
- Google Cloud service account JSON with Vision API enabled
- Railway account (railway.app)
- Vercel account (vercel.com)

---

## 1. Railway — Redis

1. Go to railway.app → New Project → **Add a service → Database → Redis**
2. Once deployed, click the Redis service → **Connect** tab → copy the `REDIS_URL`

---

## 2. Railway — Backend (FastAPI)

### Create the service

1. In the same Railway project → **New Service → GitHub Repo**
2. Select your repo
3. In service settings → **Build** tab:
   - **Dockerfile path:** `Dockerfile.backend`
   - **Build context:** `/` (repo root)
4. **Networking** tab → **Generate Domain** (this gives you `https://xxx.railway.app`)

### Set environment variables

In the service → **Variables** tab, add all of the following:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_URL` | your Vercel URL (set after Vercel deploy, update here) |
| `CORS_ORIGINS` | _(leave blank initially, add Vercel preview URL if needed)_ |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:[PW]@db.[REF].supabase.co:5432/postgres` |
| `SUPABASE_URL` | `https://[REF].supabase.co` |
| `SUPABASE_ANON_KEY` | from Supabase dashboard → API |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard → API |
| `SUPABASE_STORAGE_BUCKET` | `invoices` |
| `REDIS_URL` | from step 1 |
| `JWT_SECRET` | run `openssl rand -hex 32` locally |
| `AI_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `sk-...` |
| `AI_MODEL` | `gpt-4.1-mini` |
| `KSEF_ENV` | `dry_run` |

> The backend runs `alembic upgrade head` on startup — it will apply all migrations automatically on first deploy.

### Verify

Hit `https://xxx.railway.app/health` — should return `{"status":"ok","env":"production"}`.

---

## 3. Railway — Workers

### Create the service

1. In the same Railway project → **New Service → GitHub Repo** (same repo, second service)
2. Service settings → **Build** tab:
   - **Dockerfile path:** `Dockerfile.worker`
   - **Build context:** `/` (repo root)
3. No domain needed (workers have no HTTP port)

### Set environment variables

Same as backend EXCEPT:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres` ← **no `+asyncpg`** |
| `GOOGLE_CREDENTIALS_JSON` | paste full service account JSON as one line (see below) |

All other vars (`REDIS_URL`, `SUPABASE_*`, `OPENAI_API_KEY`, `KSEF_ENV`, etc.) — same as backend.

### Google Cloud Vision credentials

1. GCP Console → IAM & Admin → Service Accounts → your service account → Keys → Add Key → JSON
2. Open the downloaded `.json` file, copy all its contents
3. Minify to one line (remove all newlines except `\n` inside the private key)
4. Paste as the value of `GOOGLE_CREDENTIALS_JSON`

The workers' entrypoint script (`workers/entrypoint.sh`) automatically writes this to `/tmp/gcloud-key.json` and sets `GOOGLE_APPLICATION_CREDENTIALS` before starting supervisord.

### Verify

Check Railway logs for the workers service — you should see all 5 workers start:
```
ocr_worker          | started
extraction_worker   | started
xml_generation_worker | started
ksef_submission_worker | started
ksef_upo_polling_worker | started
```

---

## 4. Vercel — Frontend

### Create the project

1. vercel.com → **Add New Project → Import Git Repository**
2. Select your repo
3. In project settings before deploying:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend` ← **important**
   - Leave build command as default (`npm run build`)

### Set environment variables

In Vercel → project → **Settings → Environment Variables**, add:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[REF].supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase dashboard | All |

> `NEXT_PUBLIC_*` vars are baked in at build time — redeploy after changing them.

### Deploy

Click **Deploy**. After it goes live, copy the Vercel URL and update `APP_URL` in the Railway backend service variables.

---

## 5. Supabase — Auth redirect URLs

In Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**`

Without this, OAuth/magic-link redirects will fail in production.

---

## 6. Post-deploy checklist

- [ ] `GET /health` returns `{"status":"ok","env":"production"}`
- [ ] Landing page loads at Vercel URL
- [ ] Login / register works (Supabase Auth redirect)
- [ ] Upload a PDF → pipeline processes through OCR → extraction → review queue
- [ ] Railway worker logs show no errors
- [ ] Check Railway metrics: backend memory < 512 MB, workers combined < 512 MB

---

## Environment variable summary

See `.env.example` in the repo root for a complete reference of all variables and the correct `DATABASE_URL` format per service.

---

## Redeployment

- **Backend/Workers:** Railway auto-deploys on `git push` to main (if GitHub integration is enabled)
- **Frontend:** Vercel auto-deploys on `git push` to main
- **DB migrations:** Applied automatically on backend container start (`alembic upgrade head`)
