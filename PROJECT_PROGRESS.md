# CS Dashboard Project Progress

This file is the living build log for the CS Dashboard project.

We can keep updating this phase by phase as the app evolves.

## Project Summary

- Project: `CS Dashboard`
- Repo path: [cs-dashboard](/Users/akashlenin/Rag%202.0/cs-dashboard)
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase
- Hosting target: Railway

## Current Status

- Status: `Local app scaffold is running`
- Backend: running locally on `http://localhost:4000`
- Frontend: running locally on `http://localhost:5173`
- Supabase data import: completed

## Phase Log

### Phase 1: Source Analysis

Status: `Completed`

What we did:

- Reviewed the shared spreadsheet and narrowed scope to the `CS-Product Tracker` tab only.
- Confirmed the file in Drive was an Excel macro workbook (`.xlsm`) rather than a native Google Sheet.
- Analyzed the tracker structure and identified it as an issue-tracking dataset, not just an account list.

Key findings:

- Main working object is an issue or feature request.
- Duplicate account names are expected because one account can have multiple requests.
- Some rows reference multiple accounts in a single cell.
- Important fields include `CSM`, `PM`, `Health`, `Priority`, `Current Status`, `JIRA Ticket #`, `Renewal Date`, meeting notes, and product feedback.

### Phase 2: Data Cleaning And Import Shape

Status: `Completed`

What we did:

- Created a local source copy of the workbook.
- Built a cleaner script to normalize the tracker into import-ready CSV files.
- Designed the Supabase import model to preserve:
  - duplicate account usage across issues
  - multi-account rows
  - one issue per original sheet row

Files created:

- [scripts/clean_cs_tracker.py](/Users/akashlenin/Rag%202.0/scripts/clean_cs_tracker.py)
- [data/import/cs_accounts.csv](/Users/akashlenin/Rag%202.0/data/import/cs_accounts.csv)
- [data/import/cs_issues.csv](/Users/akashlenin/Rag%202.0/data/import/cs_issues.csv)
- [data/import/cs_issue_accounts.csv](/Users/akashlenin/Rag%202.0/data/import/cs_issue_accounts.csv)
- [data/import/cs_supabase_schema.sql](/Users/akashlenin/Rag%202.0/data/import/cs_supabase_schema.sql)
- [data/import/README.md](/Users/akashlenin/Rag%202.0/data/import/README.md)

Import model:

- `cs_accounts`
- `cs_issues`
- `cs_issue_accounts`

Imported counts:

- `cs_accounts`: `20`
- `cs_issues`: `44`
- `cs_issue_accounts`: `45`

### Phase 3: Supabase Setup

Status: `Completed`

What we did:

- Created the schema in Supabase using the SQL file.
- Imported the cleaned CSV files into the `public` schema.
- Fixed one import blocker where `resolution_eta` contained text (`Beta - June 2026`) instead of a date.

Supabase tables now in use:

- `public.cs_accounts`
- `public.cs_issues`
- `public.cs_issue_accounts`
- `public.cs_issue_import_preview`

### Phase 4: App Scaffold

Status: `Completed`

What we did:

- Created a new app folder separate from the legacy Apps Script project.
- Initialized the app folder as its own git repository.
- Scaffolded a Railway-ready fullstack app.

Files and structure:

- [package.json](/Users/akashlenin/Rag%202.0/cs-dashboard/package.json)
- [railway.json](/Users/akashlenin/Rag%202.0/cs-dashboard/railway.json)
- [README.md](/Users/akashlenin/Rag%202.0/cs-dashboard/README.md)
- [backend](/Users/akashlenin/Rag%202.0/cs-dashboard/backend)
- [frontend](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend)

Backend responsibilities:

- Read issue data from Supabase
- Provide summary metrics
- Provide filter options
- Return issue rows enriched with related accounts

Frontend responsibilities:

- Render summary cards
- Render filters
- Render the issue table
- Provide a clean Tailwind-based dashboard shell

### Phase 5: Local Run And Wiring

Status: `Completed`

What we did:

- Installed workspace dependencies with npm
- Fixed backend env loading so it reads the app-level `.env`
- Corrected the Supabase URL in the env file from the dashboard URL to the actual project API URL
- Confirmed backend and frontend run locally

Local runtime:

- Backend: `npm run dev:backend`
- Frontend: `npm run dev:frontend`

Important environment values:

- `SUPABASE_URL` should be:
  - `https://yqdbztuxlwwmetqnabdh.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` should be the real secret/service key

## Decisions Made So Far

### Data Model Decisions

- One sheet row maps to one issue record.
- Accounts are stored separately and linked through a join table.
- Duplicate account names are not treated as duplicates across issues.
- Multi-account issue rows are preserved through `cs_issue_accounts`.

### App Architecture Decisions

- Keep the old Apps Script project untouched.
- Build the new app in a separate git-backed folder.
- Use Tailwind for frontend UI.
- Use Node + Express as backend.
- Use Supabase as system of record.
- Prepare deployment around Railway.

## Known Gaps

- The current app is still a scaffold, not the full product experience.
- Editing issues from the UI is not implemented yet.
- Issue detail views or drawers are not implemented yet.
- History/timeline-style note management is not implemented yet.
- Authentication and role-based access are not implemented yet.
- Railway deployment has not been completed yet.

## Next Recommended Phases

### Phase 6: MVP Product UX

Suggested scope:

- issue detail panel or page
- richer issue table columns
- status badges and ACV formatting polish
- sorting and saved views

### Phase 7: Write Flows

Suggested scope:

- edit issue fields from the UI
- update status, owners, ETA, and notes
- persist changes back to Supabase

### Phase 8: Notes And Timeline Model

Suggested scope:

- separate issue updates from the main issue row
- add weekly meeting note entries
- preserve historical commentary cleanly

### Phase 9: Railway Deployment

Suggested scope:

- production env vars
- build validation
- deployment setup
- final smoke test

## Update Protocol

When we continue working, this file should be updated with:

- new phase number and title
- status
- what changed
- files created or modified
- important decisions
- blockers or next steps

## Useful Paths

- App repo: [cs-dashboard](/Users/akashlenin/Rag%202.0/cs-dashboard)
- Quick status: [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)
- Backend entry: [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
- Frontend entry: [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- Env example: [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)
- Progress log: [PROJECT_PROGRESS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/PROJECT_PROGRESS.md)
