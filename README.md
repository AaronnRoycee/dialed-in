# Dialed In

Personal espresso dial-in, shot tracking, coffee photo journal, and recipe learning.

## Architecture

- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend:** Python + FastAPI
- **Database / Auth / Storage:** Supabase (PostgreSQL, Auth, Storage)
- **Layout:** `frontend/`, `backend/`, `supabase/migrations/`

## Local development

1. Copy `.env.example` to `.env` and fill in your Supabase project details.
2. Run the Supabase migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor or CLI.
3. Install and run the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Install and run the backend:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

## Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `DATABASE_URL` | PostgreSQL direct connection |
| `FRONTEND_URL` | URL the FastAPI CORS should allow |

## Supabase setup

- Enable Email/Password auth.
- Apply the initial migration to create tables, indexes, RLS, triggers, and the `media` storage bucket.
- Configure site URL and redirect URLs in Authentication settings.
