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

