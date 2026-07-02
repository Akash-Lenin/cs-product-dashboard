# Full Context: CS Dashboard

This document is the single-source handoff for the `CS Dashboard` project.

It combines product context, technical context, current implementation state, key decisions, documentation links, and the recommended next phases.

## 1. Project Purpose

The `CS Dashboard` is being built to replace the current spreadsheet-heavy CS x Product issue-tracking workflow.

The current Google Sheet works for quick tracking, but it becomes difficult for:

- live edits
- dynamic filtering
- issue ownership
- weekly meeting note capture
- PRDF / Jira handoff
- revision checks
- status-driven workflows
- clean review surfaces for different teams

The goal of this app is to turn that tracker into a real operating workspace.

## 2. High-Level Product Goal

The app should serve as the working system for:

- customer-reported issue tracking
- product request review
- ownership assignment
- due-date follow-through
- weekly CS x Product syncs
- PRDF and Jira handoff
- review flows like ACV / ETA / revision checks
- dashboards for different work modes such as overview, pending, attention, meeting review, and recent intake

## 3. Current Stack

- Frontend: `React + Vite + Tailwind CSS`
- Backend: `Node.js + Express`
- Database: `Supabase`
- Hosting target: `Railway`
- Source control: `GitHub`

Repo location:

- [cs-dashboard](/Users/akashlenin/Rag%202.0/cs-dashboard)

## 4. Source Data Background

The original source of truth was a spreadsheet focused on the CS tracker.

Important characteristics from that source:

- one sheet row maps to one issue record
- duplicate account names are expected across rows
- one issue can affect multiple accounts
- issue-centric tracking is more important than account-centric tracking

The cleaned import model was designed to preserve:

- one issue per row
- multi-account relationships
- duplicate account usage across issues

## 5. Core Data Model

Main active tables:

- `cs_accounts`
- `cs_issues`
- `cs_issue_accounts`
- `cs_issue_updates`
- `cs_deleted_issues`
- `cs_meetings`
- `cs_meeting_notes`
- `cs_meeting_action_items`
- `cs_app_users`

What they do:

- `cs_accounts`: stores normalized account records
- `cs_issues`: stores the main issue row and current state
- `cs_issue_accounts`: links issues to one or more accounts
- `cs_issue_updates`: append-only activity / history log
- `cs_deleted_issues`: review-bin archive for deleted items before permanent removal
- `cs_meetings`: meeting records for the weekly sync, including a digest block
- `cs_meeting_notes`: typed notes inside a meeting, optionally linked to an issue
- `cs_meeting_action_items`: meeting follow-ups with owner, due date, and open/done status
- `cs_app_users`: signed-in users and their role (`editor` or `reviewer`) for Google SSO

## 6. Important Fields In The App Model

The issue model now includes working fields like:

- issue title
- account
- CSM
- PM
- assignee
- health
- priority
- current status
- business impact
- Jira ticket
- dev Jira ticket
- stage due date
- resolution ETA
- next steps
- meeting notes
- product feedback
- revision owner
- revision request
- customers affected

## 7. Current App Capabilities

The app already supports:

- overview dashboard
- issue table with filtering
- issue detail drawer
- tracker-only issue creation
- Jira-backed issue creation
- safe update flow from the drawer
- append-only issue history
- assignee / due-date / revision fields
- soft-delete review bin
- restore flow
- permanent delete from review bin
- direct Jira handoff link support
- multiple workspace views in the left rail
- meeting creation with digest blocks in Meeting space
- typed meeting notes with optional issue links
- meeting action items with owner, due date, and open/done tracking
- issue-history mirroring for meeting notes and action items linked to an issue
- saved lanes in Pending (My queue, Due this week, Blocked, Waiting on PM, Revision checks) with an owner filter
- derived Jira handoff states shown across the table, queues, and drawer
- quick triage actions in Recently added (priority, stage due date, owner, send to Jira)
- PRDF creation for existing issues via the quick triage `Send to Jira` action

## 8. Current Workspace Views

These views now exist in the app:

- `Overview`
- `Issues`
- `Pending`
- `Needs attention`
- `Meeting space`
- `Recently added`
- `Role views`
- `Review bin`

What they are for:

- `Overview`: leadership-style snapshot and high-level review
- `Issues`: main searchable tracker
- `Pending`: urgency-ranked work queue with saved lanes and an owner filter
- `Needs attention`: risk and stale-update driven focus view
- `Meeting space`: write workspace for running the weekly sync — meetings, digests, notes, and action items
- `Recently added`: quick triage feed for fresh intake with inline priority, due date, owner, and send-to-Jira actions
- `Role views`: CSM book, PM pipeline, and leadership review dashboards over the same tracker
- `Review bin`: deleted issue holding area before permanent delete

## 9. Create Flows

There are now two create paths:

### 9.1 Tracker-Only Creation

Use this when an issue should exist in the dashboard without forcing a PRDF immediately.

Behavior:

- creates issue in Supabase
- upserts account
- links issue to account
- logs creation history
- does not require Jira / PRDF

### 9.2 Jira-Backed Creation

Use this when the issue should also create or link a PRDF Jira ticket.

Behavior:

- creates issue in the dashboard
- can call Jira create API
- stores returned Jira key on the issue

## 10. Jira / PRDF Direction

This area has gone through a few decisions.

### Current truth

- tracker-only creation is supported and works as a separate path
- Jira-backed creation exists, but success still depends on Jira-required fields
- the app does not currently recreate the full Jira modal

### Product decision made so far

We decided that mirroring the full Jira create modal inside the dashboard is heavy and brittle because Jira has required dropdown-driven fields that are project-specific.

So the current preferred direction is:

- use the dashboard for tracker capture
- use Jira as the PRDF completion system
- support better handoff into Jira instead of hardcoding Jira’s full modal in our app

### Current Jira handoff support

- `Open in Jira` when an issue already has a Jira key
- `Create PRDF in Jira` direct redirect support via env-configured URL
- derived handoff states per issue: `PRDF not created`, `PRDF created, dev ticket pending`, `Dev ticket linked`, and `Dev ticket linked without a PRDF`
- a Jira handoff section in the issue drawer with direct ticket links
- `POST /api/issues/:issueImportKey/create-prdf` creates and links a PRDF ticket for an existing issue (used by quick triage)

## 11. Delete / Restore Design

Delete is intentionally not a hard delete first.

Current behavior:

- active issue can be moved into `Review bin`
- the app stores issue snapshot, linked accounts, and history
- someone can restore the issue later
- someone can permanently remove it from the review bin after review

This protects against accidental deletion and keeps a human review step.

## 12. Current Logic Areas

### Needs Attention

This view now uses stronger logic than before.

Signals include things like:

- red health
- amber health
- high priority
- blocked status
- overdue stage due date
- stage due soon
- slipped ETA
- missing assignee on important work
- stale updates (adjustable threshold, heavier weight when very stale)
- high ACV
- open revision check

Signal weights come from a selectable profile: `Operator` (execution focus) or `Leadership` (risk and value focus). Issues can also be snoozed off the board for a set number of days, stored on the issue row so it applies for everyone.

### Pending

This acts like a work queue ranked using:

- priority
- health
- stage due date
- blocked state
- ETA slippage
- revision check presence

## 13. Current Documentation

Primary project documents:

- [PROJECT_PROGRESS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/PROJECT_PROGRESS.md)
- [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)
- [README.md](/Users/akashlenin/Rag%202.0/cs-dashboard/README.md)
- [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)

## 14. Key Technical Files

### Frontend

- [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
- [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx)
- [frontend/src/components/MeetingSpace.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/MeetingSpace.jsx)
- [frontend/src/components/RoleViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/RoleViews.jsx)
- [frontend/src/components/IssueDetailDrawer.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueDetailDrawer.jsx)
- [frontend/src/components/NewIssueModal.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/NewIssueModal.jsx)
- [frontend/src/components/DeletedIssuesPanel.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/DeletedIssuesPanel.jsx)
- [frontend/src/components/IssueTable.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/IssueTable.jsx)
- [frontend/src/components/SummaryCards.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/SummaryCards.jsx)
- [frontend/src/styles.css](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/styles.css)

### Backend

- [backend/src/index.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/index.js)
- [backend/src/routes/issues.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/issues.js)
- [backend/src/routes/meetings.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/routes/meetings.js)
- [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)
- [backend/src/lib/meeting-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/meeting-data.js)
- [backend/src/lib/jira.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/jira.js)
- [backend/src/config/env.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/config/env.js)

## 15. Current Migrations

- [2026-06-30_issue_updates.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-06-30_issue_updates.sql)
- [2026-07-01_issue_ownership_fields.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-01_issue_ownership_fields.sql)
- [2026-07-02_deleted_issues.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_deleted_issues.sql)
- [2026-07-02_meeting_space.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_meeting_space.sql)
- [2026-07-02_attention_snooze.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_attention_snooze.sql)
- [2026-07-02_app_users.sql](/Users/akashlenin/Rag%202.0/cs-dashboard/supabase/migrations/2026-07-02_app_users.sql)

## 16. Current Environment Expectations

Important app env values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN`
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`
- `JIRA_ISSUE_TYPE`
- `JIRA_CREATED_LABEL`
- `JIRA_PRDF_CREATE_URL`
- `SUPABASE_ANON_KEY` (enables Google SSO; empty = open mode)
- `AUTH_ALLOWED_DOMAIN` (defaults to everstage.com)
- `AUTH_DEFAULT_ROLE` (defaults to reviewer)

Reference template:

- [.env.example](/Users/akashlenin/Rag%202.0/cs-dashboard/.env.example)

## 17. Current Product Decisions

These are the key decisions already made:

- build a new app separate from the old Apps Script tracker
- keep Supabase as the active system of record
- make issue tracking the center of the product
- support tracker-first creation without forcing PRDF
- treat delete as archive-first, not hard delete
- use page-like workspace views instead of putting everything on one screen
- avoid rebuilding the full Jira modal unless truly necessary

## 18. Known Gaps

Areas that still need work:

- `Meeting space` write flow works but the UI and workflow details need another refinement pass
- Jira full-modal handling is not implemented
- auth is built but needs Google Cloud + Supabase provider configuration to activate
- Railway production deployment is not complete
- workflow-specific notifications / reminders are not implemented

## 19. Current Backlog Additions Already Captured

Backlog items already called out in project docs include:

- assignee workflow
- stage or status due date
- dev Jira ticket coverage
- revision-assigned workflow
- quarterly validation-loop handling
- pending-task Jira modal handling and creation logic
- meeting space
- pending queue
- recently added
- stronger needs-attention logic
- Jira handoff improvements

## 20. Recommended Next Phases

Recommended next build order:

### Phase 1: Meeting Space Write Flow (completed 2026-07-02)

Shipped:

- note creation with types and optional issue links
- structured meeting entries with title, date, and type
- editable digest blocks per meeting
- action-item creation with owner, due date, and open/done tracking
- issue-history mirroring so linked notes and actions appear on the issue timeline
- requires running the `2026-07-02_meeting_space.sql` migration in Supabase

### Phase 2: Pending Deepening (completed 2026-07-02)

Shipped:

- `My queue`, `Due this week`, `Blocked`, `Waiting on PM`, and `Revision checks` lanes with live counts
- owner dropdown for person-specific views of any lane
- inline Blocked / Revision check badges and Jira handoff state on queue rows

### Phase 3: Jira Handoff Improvements (completed 2026-07-02)

Shipped:

- derived handoff states: `PRDF not created`, `PRDF created, dev ticket pending`, `Dev ticket linked`, `Dev ticket linked without a PRDF`
- Jira handoff section in the drawer with direct PRDF and dev ticket links
- handoff state chips in the issue table, Pending, and Recently added
- PRDF redirect button in the drawer when no ticket exists

### Phase 4: Recently Added Triage Actions (completed 2026-07-02)

Shipped:

- quick assign owner
- quick add stage due date
- quick set priority
- quick send to Jira via a new backend endpoint that creates and links the PRDF ticket

### Phase 5: Needs Attention Logic V2 (completed 2026-07-02)

Shipped:

- Operator and Leadership weight profiles for the attention score
- team-wide snooze support stored on the issue row, with a Snoozed section and unsnooze
- adjustable stale threshold (7/14/21/30 days) with a heavier weight past double the threshold
- requires running the `2026-07-02_attention_snooze.sql` migration in Supabase

### Phase 6: Role Views (completed 2026-07-02)

Shipped:

- CSM dashboard with a person picker: book risk, due dates, revision checks, book ACV
- PM dashboard with a person picker: pipeline, blockers, slipped ETAs, Jira handoff gaps
- leadership review: ACV at risk, largest exposure by ACV, pipeline by status, blocked items with owners
- these are selectable views for now; they become permission-scoped once auth lands in phase 7

### Phase 7: Auth And Permissions (completed 2026-07-02, needs configuration)

Shipped:

- Google SSO via Supabase Auth with a login screen and sign-out
- everstage.com domain restriction (configurable via `AUTH_ALLOWED_DOMAIN`)
- `cs_app_users` table with `editor` / `reviewer` roles; new sign-ins default to read-only reviewer
- backend-enforced write permissions: reviewers get a 403 on any create, edit, delete, restore, or meeting write
- audit-accurate attribution: every mutation is stamped with the signed-in user on the backend
- open-mode fallback: without `SUPABASE_ANON_KEY` the app runs with no login for local development
- setup steps (Google Cloud OAuth client, Supabase provider config, env vars) are listed in PROJECT_PROGRESS.md

### Phase 8: Production Deployment

Add:

- Railway deployment
- production env setup
- deployment verification
- safe usage readiness

## 21. Suggested Reading Order For A New Person

If someone new joins the project, they should read in this order:

1. [FULL_CONTEXT.md](/Users/akashlenin/Rag%202.0/cs-dashboard/FULL_CONTEXT.md)
2. [PROJECT_PROGRESS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/PROJECT_PROGRESS.md)
3. [STATUS.md](/Users/akashlenin/Rag%202.0/cs-dashboard/STATUS.md)
4. [README.md](/Users/akashlenin/Rag%202.0/cs-dashboard/README.md)
5. [frontend/src/App.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/App.jsx)
6. [frontend/src/components/WorkspaceViews.jsx](/Users/akashlenin/Rag%202.0/cs-dashboard/frontend/src/components/WorkspaceViews.jsx)
7. [backend/src/lib/dashboard-data.js](/Users/akashlenin/Rag%202.0/cs-dashboard/backend/src/lib/dashboard-data.js)

## 22. Current Status Summary

Today, the app is already useful as a real internal operating workspace.

It supports:

- issue review
- issue updates
- ownership visibility
- safe deletion
- restore
- meeting-note visibility
- pending work review
- attention-based triage
- recent-intake review
- Jira handoff support

The app still needs deeper workflow shaping, but the foundation is now solid and extensible.
