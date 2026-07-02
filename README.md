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

## Suggested git setup

```bash
cd cs-dashboard
git init
git add .
git commit -m "Initial CS dashboard scaffold"
```
