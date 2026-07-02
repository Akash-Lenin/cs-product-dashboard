# CS Dashboard

Railway-ready fullstack app for the CS x Product tracker.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Data: Supabase
- Hosting: Railway

## Local setup

1. Copy `.env.example` to `.env`
2. Fill in the Supabase values
3. Install dependencies:

```bash
npm install
```

4. Start the backend:

```bash
npm run dev:backend
```

5. In another terminal, start the frontend:

```bash
npm run dev:frontend
```

## Environment variables

See `.env.example`.

For Jira-backed issue creation, also configure:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`, defaults to `PRDF`
- `JIRA_ISSUE_TYPE`, defaults to `Task`
- `JIRA_CREATED_LABEL`, defaults to `cs-db-created`

When a new issue is created without an existing PRD/Jira key, the backend creates a Jira issue first, applies the configured label, then stores the returned key in `jira_ticket`.

## Supabase tables used

- `cs_accounts`
- `cs_issues`
- `cs_issue_accounts`
- `cs_issue_updates`
- `cs_deleted_issues`
- `cs_meetings`, `cs_meeting_notes`, `cs_meeting_action_items`
- `cs_app_users`

Run every file in `supabase/migrations/` in the Supabase SQL editor once, in filename order.

## Deploying to Railway

1. Push this repo to GitHub.
2. In Railway: New Project → Deploy from GitHub repo → pick this repo. Nixpacks detects Node, runs `npm ci` + `npm run build` (builds the frontend into `frontend/dist`), and starts with `npm run start` per `railway.json`. The Express backend serves both the API and the built frontend.
3. Set these variables on the Railway service:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`
   - `FRONTEND_ORIGIN=<your Railway URL>` (e.g. `https://cs-dashboard-production.up.railway.app`)
   - the `JIRA_*` values if Jira creation should work in production
   - `SUPABASE_ANON_KEY` + `AUTH_ALLOWED_DOMAIN` once Google SSO is configured (leave unset to run without sign-in)
4. Settings → Networking → Generate Domain, then put that URL into `FRONTEND_ORIGIN` and redeploy.
5. When SSO is enabled later, also add the Railway URL to the Supabase Authentication redirect allow list.
