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

### Phase 6: MVP Product UX

Status: `Advanced`

What we started:

- upgraded the issue list into a more product-like dashboard view
- added client-side sorting controls
- added issue detail drawer behavior
- improved information hierarchy for issue rows
- strengthened summary card copy and usage framing
- started write flows from the issue drawer back into Supabase
- added the first append-only history model and migration file for issue updates
- issue history migration was run in Supabase successfully
- append-only history entries are now working in the app

Outcome of this phase:

- dashboard is no longer read-only
- core issue fields can be edited safely
- weekly updates can now be appended as timeline entries
- the app supports both:
  - current issue state
  - historical issue narrative

### Phase 7: Structured Workflow

Status: `In progress`

Suggested focus:

- add typed history entries such as `meeting note`, `customer update`, `product update`, and `risk update`
- improve ownership and author attribution for history entries
- add stronger weekly review views and “needs attention” workflows
- prepare for production deployment on Railway

Work started:

- added typed history entry creation and display
- upgraded the focus board with a `Needs update this week` view based on stale or missing history
- added lightweight operator attribution stored in the browser and attached to updates

Focus for this phase:

- make the dashboard feel like a working issue workspace
- help users move from scan -> filter -> inspect quickly
- prepare the UI for future write/edit flows

## Implementation Headers

### Ownership And Assignment

Planned implementation:

- bring in assignee functionality so line items can be assigned to developers, PMs, or CSMs to indicate ownership of that task at the current stage or status
- add a stage or status due date to show when the assigned person is expected to complete the work for that stage, before the due date is reached
- add a dev Jira ticket for all PRDs tracked in the CS tracker
- add a separate revisions-assigned section so specific checks can be tagged to an owner, such as validating ACV, reviewing long ETAs, or verifying other flagged aspects of the line item
- define how to solve the validation loop so PRDFs that are formally validated only once per quarter can still be reviewed and tracked cleanly between validation windows
- support a tracker-first creation flow where an issue can be created in the dashboard without a PRDF initially
- support a PRDF creation flow where Jira APIs are used to surface PRDF fields directly in the dashboard, more like an in-app Jira creation modal
- add pending-task Jira modal handling and PRDF creation logic as a tracked integration item

### Dashboard Surfaces

Planned dashboard areas:

- `Meeting space`: a dedicated workspace to store meeting notes, discussion context, outcomes, and follow-ups tied to issues
- `Pending`: a work queue showing tickets assigned across people, prioritized by due date, urgency, and current status
- `Needs attention`: refine the existing logic so it better surfaces stale updates, high-risk accounts, high ACV blockers, and overdue stage owners
- `Recently added`: a feed of newly created issues, new PRDF links, and fresh customer escalations for quick triage

Suggested additions:

- `My queue`: a personal view for the current operator showing what is assigned to them, what is due soon, and what needs revision from them
- `Due this week`: a time-based dashboard for stage due dates, resolution ETAs, and items about to slip
- `Revision checks`: a focused board for ACV checks, ETA reviews, and other revision-owner actions
- `Meeting digest`: a summary surface showing the latest meeting updates, top decisions, and unresolved actions from recent syncs
- `Jira handoff`: a workspace for tracker items that still need PRDF completion, Jira creation, or dev-ticket follow-through

Current implementation:

- the create-issue entry point now splits into two explicit paths: `Tracker issue only` and `Create PRDF in Jira`
- tracker-only creation now stores the issue in Supabase without forcing a PRDF ticket
- the Jira-backed path now keeps PRDF creation behavior intentional instead of assuming every blank Jira field should create one
- we should not try to recreate the full Jira modal inside the dashboard, because Jira has mandatory dropdown fields and side-loading all of that metadata into the app would add too much complexity for this workflow
- preferred direction: keep the dashboard focused on tracker capture, then hand off PRDF completion to Jira in a cleaner follow-up step when full Jira-required fields are needed
- active issues can now be moved into a review bin instead of being hard-deleted immediately
- deleted items are stored with their issue snapshot, linked accounts, and captured history so someone else can review, restore, or permanently remove them later
- first dashboard expansion pass now adds dedicated `Pending`, `Meeting space`, `Needs attention`, and `Recently added` workspace views in the app navigation
- `Needs attention` is now driven by stronger risk logic using health, priority, blockers, overdue stage dates, stale updates, and revision checks
- `Pending` now acts as an owner-focused work queue with urgency ranking, due-soon items, and revision-check visibility

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

## Latest Stabilization Note

Date: 2026-06-30
Status: completed

What changed:

- fixed a render loop in the issue detail drawer that was repeatedly resetting form state
- tightened selected-issue syncing in the main app so the drawer only refreshes when the actual issue record changes
- verified the app still builds successfully after the fix

Files modified:

- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest UX Refresh

Date: 2026-07-01
Status: completed

What changed:

- reworked the app into a calmer full-width workspace instead of one long stack of equally heavy sections
- added a left-side workspace rail on desktop with section links and operator identity
- separated the page into clearer zones: overview, focus board, and full tracker
- moved tracker filters into their own side panel so the issue list remains the primary reading surface
- tightened card and panel styling to reduce first-screen overload

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/FilterBar.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/FilterBar.jsx)
- [frontend/src/components/IssueFocusBoard.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueFocusBoard.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [frontend/src/components/SummaryCards.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/SummaryCards.jsx)
- [frontend/src/components/UserIdentityBar.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/UserIdentityBar.jsx)
- [frontend/src/styles.css](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/styles.css)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Navigation Simplification

Date: 2026-07-01
Status: completed

What changed:

- changed the app from one long multi-section page into page-like workspace views inside the same shell
- added explicit view switching between overview, focus board, and tracker
- kept filters and issue results together only on the tracker view so the working surface feels less crowded
- improved unreachable-backend messaging so `Failed to fetch` reads as a backend connectivity issue instead of a filter failure

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Ownership Implementation Pass

Date: 2026-07-01
Status: completed

What changed:

- added the first ownership-model fields to the issue record
- wired backend update support for primary assignee, stage due date, dev Jira ticket, revision owner, and revision request
- added drawer UI so these fields can be reviewed and edited inside the issue workspace
- surfaced the new ownership signals in the tracker table for faster scanning

Migration added:

- [2026-07-01_issue_ownership_fields.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-01_issue_ownership_fields.sql)

Files modified:

- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Ownership UX Pass

Date: 2026-07-01
Status: completed

What changed:

- added assignee filtering in the tracker controls
- reorganized the issue drawer so ownership fields live in a clearly labeled ownership section
- surfaced stage due date urgency more clearly in the tracker table
- updated the focus board so it calls out items with stage due dates that are due soon or already overdue

Files modified:

- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [frontend/src/components/FilterBar.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/FilterBar.jsx)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/src/components/IssueFocusBoard.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueFocusBoard.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Design Handoff Pass

Date: 2026-07-01
Status: completed

What changed:

- reworked the app shell toward the Everstage handoff structure with a fixed sidebar, topbar, and two primary views
- rebuilt the overview screen around metric cards, needs-attention items, status distribution, and a meeting digest
- restyled the issues screen to match the cleaner filter row and table layout from the handoff
- redesigned the issue drawer so it looks and reads more like the provided reference while keeping the live editing workflow
- added light and dark theme support using app-level design tokens

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/FilterBar.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/FilterBar.jsx)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [frontend/src/components/SummaryCards.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/SummaryCards.jsx)
- [frontend/src/styles.css](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/styles.css)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Corrective Design Pass

Date: 2026-07-01
Status: completed

What changed:

- moved the main app shell, sidebar, topbar, cards, overview rows, meeting digest, and layout proportions into explicit CSS classes
- restored the fixed `236px` sidebar and constrained overview content width so the page does not stretch edge-to-edge
- tightened metric card, needs-attention, status, and meeting digest alignment to better match the handoff proportions
- changed `New issue` back to a visual-only button until creation is implemented, so it no longer moves the user to a different view
- fixed the needs-attention row behavior so clicking a row opens the drawer without forcing a view change

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/SummaryCards.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/SummaryCards.jsx)
- [frontend/src/styles.css](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/styles.css)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest New Issue Flow

Date: 2026-07-01
Status: completed

What changed:

- made the `New issue` topbar action functional
- added a compact create modal for issue title, account, impact, health, priority, status, owners, Jira tickets, and stage due date
- added backend support to create the issue, create or reuse the account, link the issue to the account, and return the enriched issue row
- logs creation into issue history when the history table is available
- opens the newly created issue in the drawer after creation

Files modified:

- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [backend/src/routes/issues.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/issues.js)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/NewIssueModal.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/NewIssueModal.jsx)
- [frontend/src/styles.css](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/styles.css)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Jira Creation Integration

Date: 2026-07-01
Status: completed

What changed:

- new issue creation now creates a PRDF Jira ticket when the user leaves the PRD/Jira ticket field blank
- created Jira tickets receive the configured label, defaulting to `cs-db-created`
- the returned Jira key is stored in `jira_ticket` on the new tracker row
- if the user enters an existing Jira key, the app skips Jira creation and links that key to the tracker row
- documented the required Jira environment variables in the env example and README

Files modified:

- [backend/src/config/env.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/config/env.js)
- [backend/src/lib/jira.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/jira.js)
- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [frontend/src/components/NewIssueModal.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/NewIssueModal.jsx)
- [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)
- [README.md](/Users/akashlenin/Rag%202.0/cs-dashboard/README.md)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

## Latest Meeting Space Write Flow

Date: 2026-07-02
Status: completed

What changed:

- `Meeting space` is now a write workspace instead of a read-only surface derived from issue fields
- added three new Supabase tables: `cs_meetings` for meeting records, `cs_meeting_notes` for typed notes inside a meeting, and `cs_meeting_action_items` for tracked follow-ups
- meetings can be created from the left rail of the view with a title and date, and each meeting carries an editable digest block for the weekly summary
- notes support five types (discussion, decision, risk, follow-up, general), optional linking to a tracker issue, and author attribution from the operator name
- action items support an owner, a due date, an optional linked issue, and an open/done checkbox that stamps `completed_at`
- notes and action items that are linked to an issue are also mirrored into that issue's append-only history (`cs_issue_updates`) as `meeting_note` entries, so the issue timeline stays complete
- the view keeps a condensed "Issues with meeting context" section so older meeting notes stored on issue rows remain visible
- missing-table handling matches the rest of the app: the API returns a 503 with a clear message until the migration is run

Files created:

- [supabase/migrations/2026-07-02_meeting_space.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_meeting_space.sql)
- [backend/src/lib/meeting-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/meeting-data.js)
- [backend/src/routes/meetings.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/meetings.js)
- [frontend/src/components/MeetingSpace.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/MeetingSpace.jsx)

Files modified:

- [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

New API endpoints:

- `GET /api/meetings` returns meetings with embedded notes and action items
- `POST /api/meetings` creates a meeting
- `PATCH /api/meetings/:meetingId` updates title, date, type, or digest
- `POST /api/meetings/:meetingId/notes` adds a note
- `POST /api/meetings/:meetingId/actions` adds an action item
- `PATCH /api/meetings/actions/:actionId` edits or toggles an action item

Setup required:

- run [2026-07-02_meeting_space.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_meeting_space.sql) in Supabase before using the new view (done on 2026-07-02)

Known follow-ups:

- the Meeting space UI and interaction details need another refinement pass (layout polish, composer ergonomics, and general workflow feel)

## Latest Pending Lanes, Jira Handoff States, And Quick Triage

Date: 2026-07-02
Status: completed

What changed (covers phases 2, 3, and 4 from the recommended build order):

Phase 2 — Pending deepening:

- the Pending view now has saved lanes over the same urgency-ranked queue: `All pending`, `My queue`, `Due this week`, `Blocked`, `Waiting on PM`, and `Revision checks`, each with a live count on its chip
- `My queue` matches issues where the operator name is the assignee, CSM, PM, or revision owner, and shows a hint when no operator name is set
- an owner dropdown filters any lane down to a single person, which covers the owner-based saved-view requirement
- queue rows now carry inline Blocked and Revision check badges plus the Jira handoff state

Phase 3 — Jira handoff improvements:

- a shared helper now derives one of four handoff states per issue: `PRDF not created`, `PRDF created, dev ticket pending`, `Dev ticket linked`, and `Dev ticket linked without a PRDF`
- the issue drawer has a dedicated Jira handoff section showing the state badge, the PRDF ticket, and the dev ticket, each as a direct Jira link when the base URL is configured, plus a `Create PRDF in Jira` redirect when no PRDF exists
- the issue table shows the short handoff state under the status column so handoff gaps are visible at a glance

Phase 4 — Recently added triage actions:

- every row in Recently added now has a quick triage bar: set priority, set stage due date, assign an owner, and send to Jira, all without opening the drawer
- `Send to Jira` calls a new backend endpoint that creates the PRDF ticket for an existing issue, stores the returned Jira key on the row, and logs the creation into issue history
- quick edits reuse the existing PATCH endpoint and log field changes into history the same way drawer saves do

Files created:

- [frontend/src/lib/jira-handoff.js](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/lib/jira-handoff.js)

Files modified:

- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [backend/src/routes/issues.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/issues.js)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

New API endpoint:

- `POST /api/issues/:issueImportKey/create-prdf` creates a PRDF Jira ticket for an existing tracker issue and links the returned key (409 if one is already linked, 503 if Jira env vars are missing)

Setup required:

- none; no new migration. `Send to Jira` needs the existing Jira env vars, and a backend restart is required for the new endpoint.

## Latest Needs Attention Logic V2

Date: 2026-07-02
Status: completed

What changed (phase 5 from the recommended build order):

- the attention score now runs on selectable weight profiles instead of fixed weights: `Operator` favors execution signals (overdue stages, blockers, missing owners, stale updates) while `Leadership` favors risk and value signals (red health, slipped ETAs, high-ACV exposure)
- the stale-update threshold is now adjustable (7 / 14 / 21 / 30 days) and issues that go past double the threshold get a heavier "very stale" weight; the stale chip now shows the actual day count
- issues can be snoozed off the attention board for 3, 7, 14, or 30 days; snoozes are stored on the issue row (`attention_snoozed_until`, `attention_snoozed_by`) so they hold for the whole team, not just one browser
- snoozed issues collect in a `Snoozed` section below the priority stack with the snooze date, who snoozed it, and an Unsnooze button
- the profile choice and stale threshold persist per browser in localStorage

Files created:

- [supabase/migrations/2026-07-02_attention_snooze.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_attention_snooze.sql)

Files modified:

- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

Setup required:

- run [2026-07-02_attention_snooze.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_attention_snooze.sql) in Supabase before using snooze, then restart the backend

## Latest Role Views

Date: 2026-07-02
Status: completed

What changed (phase 6 from the recommended build order):

- a new `Role views` entry in the left rail holds three dashboards over the same tracker data, switchable with tabs
- the CSM view takes a person picker and shows that CSM's book: active issue count, at-risk count, due-in-7-days count, tracked book ACV, plus lists for at-risk issues, upcoming due dates, and their open revision checks
- the PM view takes a person picker and shows that PM's pipeline: discovery/review/planned items, blocked count, slipped ETAs, and a handoff-gaps list built from the derived Jira handoff states (no PRDF, or PRDF without a dev ticket)
- the leadership review needs no person: ACV at risk, red health count, blocked count, missing PRDFs, the largest-exposure list ranked by ACV, a pipeline-by-status breakdown, and every blocked item with its owners
- if the operator name matches a CSM or PM in the data, that person is preselected; tab and person choices persist per browser
- since auth does not exist yet (phase 7), these are selectable views rather than permission-scoped dashboards

Files created:

- [frontend/src/components/RoleViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/RoleViews.jsx)

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

Setup required:

- none; frontend-only change, no migration and no backend restart

## Latest Google SSO And Roles

Date: 2026-07-02
Status: completed (code); needs Google / Supabase configuration before it activates

What changed (phase 7 from the recommended build order):

- sign-in now works through Supabase Auth with Google as the provider; the frontend shows a login screen and the backend verifies the session token on every API call
- access is restricted to `everstage.com` Google accounts (configurable via `AUTH_ALLOWED_DOMAIN`); other accounts are rejected even after Google sign-in succeeds
- a new `cs_app_users` table stores each person who signs in, with a role of `editor` or `reviewer`; new sign-ins default to `reviewer` (read-only)
- reviewers can view every workspace, filter, and drawer, but all writes (create, edit, delete, restore, meetings, quick triage) return a clear 403 until someone promotes them: `update cs_app_users set role = 'editor' where email = '...'`
- every mutation is now attributed to the signed-in user on the backend, so history entries are audit-accurate regardless of what the client sends
- the sidebar shows the signed-in person, their role, and a sign-out button; the New issue button is hidden for reviewers
- if `SUPABASE_ANON_KEY` is not set, the app runs in the old open mode with no login, so local development is not blocked mid-setup

Files created:

- [supabase/migrations/2026-07-02_app_users.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_app_users.sql)
- [backend/src/lib/auth.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/auth.js)
- [backend/src/routes/auth.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/auth.js)
- [frontend/src/lib/api.js](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/lib/api.js)
- [frontend/src/components/LoginScreen.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/LoginScreen.jsx)

Files modified:

- [backend/src/config/env.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/config/env.js)
- [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/MeetingSpace.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/MeetingSpace.jsx)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/package.json](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/package.json)
- [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

Setup required (in order):

1. Run [2026-07-02_app_users.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_app_users.sql) in the Supabase SQL editor
2. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application) with the authorized redirect URI from Supabase (Authentication → Providers → Google shows the exact callback URL, like `https://<project-ref>.supabase.co/auth/v1/callback`)
3. In Supabase → Authentication → Providers → Google: enable it and paste the Google client ID and secret
4. In Supabase → Authentication → URL Configuration: add `http://localhost:5173` to the redirect allow list (and the Railway URL later)
5. Add `SUPABASE_ANON_KEY` to `.env` (Supabase → Settings → API → anon public key)
6. Run `npm install` at the project root (new frontend dependency: `@supabase/supabase-js`)
7. Restart the backend and refresh the frontend
8. Sign in once, then promote yourself: `update cs_app_users set role = 'editor' where email = 'akashlenin@everstage.com';`

## Latest Railway Deployment Prep

Date: 2026-07-02
Status: repo is deploy-ready; the Railway dashboard steps are manual

What changed (phase 8 from the recommended build order):

- refreshed `package-lock.json` to include the new frontend dependency and verified with a clean `npm ci --dry-run` that all 259 packages resolve, which is the usual Railway build failure
- committed all of today's work (meeting space, pending lanes, Jira handoff, quick triage, attention v2, role views, SSO groundwork) in one commit on `main`
- documented the full Railway deploy procedure and required environment variables in the README
- `railway.json` was already correct: Nixpacks build, `npm run start`, restart on failure; the backend serves the built frontend so one Railway service runs everything

Still manual (needs the GitHub/Railway account owner):

1. `git push origin main` from a machine with GitHub credentials
2. Railway → New Project → Deploy from GitHub repo
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, `FRONTEND_ORIGIN=<railway url>`, plus `JIRA_*` if needed
4. Generate a domain under Settings → Networking, set it as `FRONTEND_ORIGIN`, redeploy
5. When SSO is turned on later: add `SUPABASE_ANON_KEY`, and add the Railway URL to the Supabase auth redirect allow list

## Latest Overview Refinement

Date: 2026-07-02
Status: completed

What changed:

- the `Last meeting update` section no longer fakes its data; it previously showed a hardcoded date and pulled notes stored on issue rows. It now renders the most recent real meeting from `cs_meetings` as a crisp three-column recap: Discussed (notes), Decisions & risks (typed notes), and Action items with owner, due date, and done state, capped at 4 items per column with a link into Meeting space
- the overview `Needs attention` panel now uses the same weighted v2 scoring as the full view, respects snoozes, shows the top two signals per row, and its View all link goes to the Needs attention view instead of Issues
- a `Due this week` panel now sits under the status breakdown: stage due dates in the next 7 days plus overdue items, overdue first, click-through to the drawer, with a link into Pending
- summary cards were reworked for operations: Total issues, At risk, Overdue stages, Open action items (from meetings), and Tracked ACV replace the old High priority / Released cards
- the Meeting space sidebar count now shows the number of logged meetings instead of issues that happen to carry meeting notes

Files created:

- [frontend/src/components/OverviewPanels.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/OverviewPanels.jsx)

Files modified:

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/SummaryCards.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/SummaryCards.jsx)
- [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx) (attention helpers exported for reuse)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)

Known follow-up:

- meetings created in Meeting space update the overview after a page refresh; live sync between the two views is a later polish item

## Useful Paths

- App repo: [cs-dashboard](/Users/akashlenin/Rag%202.0/cs-dashboard)
- Quick status: [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)
- History migration: [2026-06-30_issue_updates.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-06-30_issue_updates.sql)
- Backend entry: [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
- Frontend entry: [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- Env example: [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)
- Progress log: [PROJECT_PROGRESS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/PROJECT_PROGRESS.md)
