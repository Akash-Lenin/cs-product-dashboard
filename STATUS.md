# CS Dashboard Status

## Snapshot

- Project: `CS Dashboard`
- Status: `Phase 6 advanced`
- Current phase: `Ready for structured workflow improvements`
- Local backend: running on `http://localhost:4000`
- Local frontend: running on `http://localhost:5173`
- Database: Supabase connected
- Deployment target: Railway

## Completed

- Reviewed and analyzed the source CS tracker
- Cleaned and normalized import data
- Created Supabase schema and imported tracker data
- Scaffolded the new fullstack app
- Wired frontend, backend, and Supabase locally
- Verified the local app loads successfully

## Current Data Model

- `cs_accounts`
- `cs_issues`
- `cs_issue_accounts`

## Current App Scope

- Summary cards
- Filter bar
- Issue table
- Supabase-backed API

## Next Phase

### Phase 6: MVP Product UX

Priority work:

- issue detail view or drawer
- better information hierarchy in the issue table
- cleaner formatting for status, ACV, and dates
- richer filtering and sorting
- stronger first-pass dashboard design
- edit-ready drawer for weekly review updates
- append-only issue history groundwork
- append-only issue history is now live

## Newly Working

- edit current issue fields from the drawer
- save updates back to Supabase
- append history entries without overwriting older context
- view timeline entries per issue

## Recommended Next Phase

### Phase 7: Structured Workflow

Priority work:

- classify history entries by type
- add owner or user attribution more cleanly
- improve current-state vs history separation
- add meeting-ready views like `Needs update this week`
- prepare Railway deployment and production env setup

Progress:

- typed history entries added in app flow
- `Needs update this week` focus lane added
- lightweight operator attribution added in app flow
- issue drawer render loop fixed so save/edit flow is stable again
- save normalization added for blank date values like `resolution_eta`
- dashboard layout refreshed into a calmer full-width workspace with left rail navigation and separated review zones
- workspace now uses page-like view switching so overview, focus, and tracker do not compete on the same screen
- assignee functionality is now captured in the project doc as a planned ownership workflow
- stage or status due date is now captured as part of the planned ownership workflow
- dev Jira ticket coverage for PRDs in the CS tracker is now captured in the implementation list
- revisions-assigned workflow is now captured as a separate review ownership section for checks like ACV and ETA validation
- first ownership implementation pass added assignee, stage due date, dev Jira ticket, revision owner, and revision request fields to the app model
- ownership UX pass added assignee filtering, a dedicated ownership drawer section, and due-date visibility in tracker views
- frontend shell, issues table, overview cards, and issue drawer were restyled toward the Everstage design handoff with light/dark theming
- corrective design pass restored fixed sidebar proportions, constrained overview content, stabilized card and row alignment, and removed accidental New Issue navigation
- New issue flow now creates issue records, upserts the account, links the issue to that account, logs creation history, and opens the created issue
- New issue flow now supports two explicit paths: tracker-only issue creation without a PRDF, and a Jira-backed PRDF creation flow
- Jira-backed creation still creates a PRDF Jira ticket with the `cs-db-created` label when no existing Jira key is supplied, then stores the returned Jira key on the tracker row
- `Open` is now available as a status option, and the quarterly PRDF validation-loop requirement is now captured in the implementation list
- the create modal now makes the PRDF choice explicit instead of inferring it from an empty Jira field
- product direction is now to avoid embedding a full Jira modal in the dashboard, since Jira has mandatory dropdown-driven fields that would make in-app field mirroring too heavy
- issues can now be moved into a review bin from the drawer, restored back into the active tracker, or deleted permanently after review
- deleted issue storage now has its own Supabase migration and keeps issue, account, and history snapshots together for review
- dashboard backlog now includes meeting space, pending queue, recently added, refined needs-attention logic, and pending-task Jira modal / creation handling
- first dashboard workspace expansion is now live with dedicated Pending, Meeting space, Needs attention, and Recently added views in the left rail
- Meeting space is now a full write workspace: meetings can be created with a date and title, each meeting has an editable digest block, and typed notes (discussion, decision, risk, follow-up, general) can be added with optional issue links
- meeting action items now exist with owner, due date, optional issue link, and an open/done toggle that stamps completion time
- meeting notes and action items linked to an issue are mirrored into that issue's append-only history so the issue timeline stays complete
- meeting storage has its own Supabase migration (`cs_meetings`, `cs_meeting_notes`, `cs_meeting_action_items`) and the API returns a clear 503 until it is run
- Pending now has saved lanes (All pending, My queue, Due this week, Blocked, Waiting on PM, Revision checks) with live counts plus an owner dropdown for person-specific views
- Jira handoff state is now derived per issue (PRDF not created / PRDF created, dev ticket pending / Dev ticket linked) and shown in the issue table, the Pending queue, Recently added, and a dedicated drawer section with direct Jira links
- Recently added rows now have a quick triage bar: set priority, set stage due date, assign an owner, and send to Jira without opening the drawer
- a new backend endpoint creates a PRDF Jira ticket for an existing issue, links the returned key, and logs it into issue history
- Needs attention now has Operator and Leadership weight profiles, an adjustable stale threshold (7/14/21/30 days) with a heavier very-stale weight, and team-wide snooze support stored on the issue row with a Snoozed section and unsnooze (requires the attention snooze migration)
- a new Role views workspace holds three dashboards: a CSM book view (risk, due dates, revision checks, book ACV), a PM pipeline view (discovery/review items, blockers, slipped ETAs, handoff gaps), and a leadership review (ACV at risk, largest exposure, pipeline by status, blocked items)
- Google SSO is now built in via Supabase Auth: everstage.com accounts only, editor vs reviewer roles in a new cs_app_users table (new sign-ins are read-only reviewers), backend-enforced write permissions, audit-accurate attribution, and a login screen with sign-out; runs in open mode until SUPABASE_ANON_KEY and the Google provider are configured
- the repo is Railway deploy-ready: lockfile refreshed and validated, all work committed on main, deploy steps and env vars documented in the README; pushing to GitHub and creating the Railway service are the remaining manual steps
- the Overview was refined: the last-meeting section now shows the latest real meeting as a three-column recap (discussed / decisions & risks / action items with owners and due dates), the attention panel uses the weighted v2 scoring and respects snoozes, a Due this week panel surfaces near-term and overdue stage dates, and the summary cards now track At risk, Overdue stages, and Open action items
- Meeting space is now a collaboration board: creating a meeting opens it live, issues are raised into it from the Issues view via a per-row + Meeting button, an owner filter narrows the board per person, and issue history entries link back to the meeting board (requires the meeting collab migration)
- the board format changed from kanban to a topic table: each discussed item is a row with its decision, decision owner, and action items on the same line; decisions on issue-linked topics are mirrored into issue history; general action items and legacy standalone notes have their own sections (requires the meeting topics migration)
- the issue drawer was trimmed: Working state (assignee, stage due, health, priority, status, ETA), People & tickets, and Notes replace the old three sections; meeting-note and product-feedback inputs are retired in favor of Meeting space, and revision fields show read-only
- security hardening: deny-all row-level security migration for all app tables (run before enabling SSO), and the backend now fails closed in production when auth is unconfigured instead of silently running open

## Reference Files

- Detailed progress log: [PROJECT_PROGRESS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/PROJECT_PROGRESS.md)
- Frontend app: [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- Backend API: [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
