import { useMemo, useState } from "react";
import { jiraHandoffState } from "../lib/jira-handoff.js";

const ROLE_TABS = [
  { key: "csm", label: "CSM view" },
  { key: "pm", label: "PM view" },
  { key: "leadership", label: "Leadership review" }
];

function formatAcvCompact(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `$${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `$${Math.round(number / 1000)}k`;
  return `$${number}`;
}

function formatDateLabel(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function healthColor(health) {
  if (health === "Green") return "var(--health-green)";
  if (health === "Amber") return "var(--health-amber)";
  if (health === "Red") return "var(--health-red)";
  return "var(--health-unknown)";
}

function statusColor(status) {
  const map = {
    Open: "var(--status-open)",
    "In Discovery": "var(--status-discovery)",
    "In Development": "var(--status-development)",
    "Under Review": "var(--status-review)",
    Blocked: "var(--status-blocked)",
    Planned: "var(--status-planned)",
    Released: "var(--status-released)"
  };
  return map[status] || "var(--health-unknown)";
}

function accountSummary(issue) {
  return (issue.accounts || []).map((account) => account.accountName).join(", ") || issue.account_name_raw || "No account";
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-4">
      {eyebrow ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-1 text-[18px] font-semibold" style={{ color: "var(--app-text)" }}>
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function StatCards({ cards }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[12px] border px-4 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
          <div className="text-[12px] font-semibold" style={{ color: "var(--app-text-muted)" }}>{card.label}</div>
          <div className="mt-3 text-[28px] font-bold" style={{ color: "var(--app-text)" }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

function IssueListPanel({ title, subtitle, entries, onSelectIssue, emptyMessage, renderMeta }) {
  return (
    <section className="cs-panel overflow-hidden">
      <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
        <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>{subtitle}</p>
        ) : null}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
        {entries.length ? (
          entries.map((issue) => (
            <button
              key={issue.issue_import_key}
              type="button"
              onClick={() => onSelectIssue(issue)}
              className="flex w-full items-start gap-3 px-6 py-4 text-left transition hover:bg-[var(--app-surface-2)]"
            >
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: healthColor(issue.health) }} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                  {renderMeta(issue)}
                </div>
              </div>
              <span className="shrink-0 text-[13px] font-semibold" style={{ color: "var(--app-text)" }}>
                {formatAcvCompact(issue.acv)}
              </span>
            </button>
          ))
        ) : (
          <div className="px-6 py-6 text-sm" style={{ color: "var(--app-text-muted)" }}>{emptyMessage}</div>
        )}
      </div>
    </section>
  );
}

function PersonPicker({ label, people, value, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "var(--app-text-muted)" }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--app-text-body)] outline-none"
      >
        <option value="">Select…</option>
        {people.map((person) => (
          <option key={person} value={person}>{person}</option>
        ))}
      </select>
    </label>
  );
}

function CsmDashboard({ issues, csmName, onSelectIssue }) {
  const myIssues = issues.filter((issue) => issue.csm === csmName);
  const active = myIssues.filter((issue) => issue.current_status !== "Released");
  const atRisk = active.filter((issue) => issue.health === "Red" || issue.health === "Amber");
  const dueSoon = active
    .map((issue) => ({ issue, dueDays: daysUntil(issue.stage_due_date) }))
    .filter((entry) => entry.dueDays !== null && entry.dueDays <= 7)
    .sort((left, right) => left.dueDays - right.dueDays);
  const revisionChecks = active.filter((issue) => issue.revision_owner === csmName || (issue.revision_request && issue.csm === csmName));

  return (
    <div className="flex flex-col gap-6">
      <StatCards
        cards={[
          { label: "Active issues", value: active.length },
          { label: "At risk", value: atRisk.length },
          { label: "Due in 7 days", value: dueSoon.length },
          { label: "Book ACV tracked", value: formatAcvCompact(myIssues.reduce((sum, issue) => sum + Number(issue.acv || 0), 0)) }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <IssueListPanel
          title="My at-risk issues"
          subtitle="Red and amber health across your book, largest ACV first."
          entries={[...atRisk].sort((left, right) => Number(right.acv || 0) - Number(left.acv || 0)).slice(0, 10)}
          onSelectIssue={onSelectIssue}
          emptyMessage="Nothing in your book is red or amber right now."
          renderMeta={(issue) => (
            <>
              <span>{accountSummary(issue)}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(issue.current_status) }} />
                {issue.current_status || "Unknown"}
              </span>
            </>
          )}
        />

        <IssueListPanel
          title="My due dates"
          subtitle="Stage due dates in the next 7 days, plus anything overdue."
          entries={dueSoon.map((entry) => entry.issue).slice(0, 10)}
          onSelectIssue={onSelectIssue}
          emptyMessage="No stage due dates in the next week."
          renderMeta={(issue) => {
            const dueDays = daysUntil(issue.stage_due_date);
            return (
              <>
                <span>{accountSummary(issue)}</span>
                <span>•</span>
                <span>
                  {dueDays !== null && dueDays < 0
                    ? `${Math.abs(dueDays)}d overdue`
                    : `Due ${formatDateLabel(issue.stage_due_date)}`}
                </span>
              </>
            );
          }}
        />
      </div>

      <IssueListPanel
        title="My revision checks"
        subtitle="Items where you own a revision check or a review ask is open on your book."
        entries={revisionChecks.slice(0, 10)}
        onSelectIssue={onSelectIssue}
        emptyMessage="No open revision checks on your book."
        renderMeta={(issue) => (
          <>
            <span>{issue.revision_request || "Review needed"}</span>
            <span>•</span>
            <span>{accountSummary(issue)}</span>
          </>
        )}
      />
    </div>
  );
}

function PmDashboard({ issues, pmName, onSelectIssue }) {
  const myIssues = issues.filter((issue) => issue.pm === pmName);
  const active = myIssues.filter((issue) => issue.current_status !== "Released");
  const pipeline = active.filter((issue) => ["In Discovery", "Under Review", "Planned"].includes(issue.current_status));
  const blocked = active.filter((issue) => issue.current_status === "Blocked");
  const slipped = active.filter((issue) => {
    const etaDays = daysUntil(issue.resolution_eta);
    return etaDays !== null && etaDays < 0;
  });
  const handoffGaps = active.filter((issue) => {
    const state = jiraHandoffState(issue).key;
    return state === "prdf_created" || state === "no_prdf";
  });

  return (
    <div className="flex flex-col gap-6">
      <StatCards
        cards={[
          { label: "Active with me", value: active.length },
          { label: "In product pipeline", value: pipeline.length },
          { label: "Blocked", value: blocked.length },
          { label: "ETA slipped", value: slipped.length }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <IssueListPanel
          title="Product pipeline"
          subtitle="Discovery, review, and planned items sitting with product."
          entries={pipeline.slice(0, 12)}
          onSelectIssue={onSelectIssue}
          emptyMessage="Nothing is sitting in discovery, review, or planned right now."
          renderMeta={(issue) => (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(issue.current_status) }} />
                {issue.current_status}
              </span>
              <span>•</span>
              <span>{accountSummary(issue)}</span>
            </>
          )}
        />

        <IssueListPanel
          title="Handoff gaps"
          subtitle="Items without a PRDF, or with a PRDF but no dev ticket yet."
          entries={handoffGaps.slice(0, 12)}
          onSelectIssue={onSelectIssue}
          emptyMessage="Every active item with you has a PRDF and a dev ticket."
          renderMeta={(issue) => {
            const handoff = jiraHandoffState(issue);
            return (
              <>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: handoff.background, color: handoff.color }}>
                  {handoff.shortLabel}
                </span>
                <span>•</span>
                <span>{accountSummary(issue)}</span>
              </>
            );
          }}
        />
      </div>

      <IssueListPanel
        title="Blocked and slipped"
        subtitle="Blocked items and anything past its resolution ETA."
        entries={[...new Set([...blocked, ...slipped])].slice(0, 10)}
        onSelectIssue={onSelectIssue}
        emptyMessage="Nothing with you is blocked or past its ETA."
        renderMeta={(issue) => {
          const etaDays = daysUntil(issue.resolution_eta);
          return (
            <>
              {issue.current_status === "Blocked" ? (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#F8DAE2", color: "#842A42" }}>Blocked</span>
              ) : null}
              {etaDays !== null && etaDays < 0 ? <span>ETA slipped {Math.abs(etaDays)}d</span> : null}
              <span>•</span>
              <span>{accountSummary(issue)}</span>
            </>
          );
        }}
      />
    </div>
  );
}

function LeadershipDashboard({ issues, onSelectIssue }) {
  const active = issues.filter((issue) => issue.current_status !== "Released");
  const atRisk = active.filter((issue) => issue.health === "Red" || issue.health === "Amber");
  const acvAtRisk = atRisk.reduce((sum, issue) => sum + Number(issue.acv || 0), 0);
  const blocked = active.filter((issue) => issue.current_status === "Blocked");
  const noPrdf = active.filter((issue) => jiraHandoffState(issue).key === "no_prdf");

  const statusOrder = ["Open", "In Discovery", "In Development", "Under Review", "Blocked", "Planned", "Released"];
  const statusCounts = statusOrder
    .map((status) => ({ status, count: issues.filter((issue) => issue.current_status === status).length }))
    .filter((entry) => entry.count > 0);
  const maxStatusCount = Math.max(...statusCounts.map((entry) => entry.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <StatCards
        cards={[
          { label: "ACV at risk", value: formatAcvCompact(acvAtRisk) },
          { label: "Red health", value: active.filter((issue) => issue.health === "Red").length },
          { label: "Blocked", value: blocked.length },
          { label: "No PRDF yet", value: noPrdf.length }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]">
        <IssueListPanel
          title="Largest exposure"
          subtitle="At-risk issues ranked by tracked ACV."
          entries={[...atRisk].sort((left, right) => Number(right.acv || 0) - Number(left.acv || 0)).slice(0, 10)}
          onSelectIssue={onSelectIssue}
          emptyMessage="No red or amber issues in the portfolio right now."
          renderMeta={(issue) => (
            <>
              <span>{accountSummary(issue)}</span>
              <span>•</span>
              <span>{issue.csm || "No CSM"} / {issue.pm || "No PM"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(issue.current_status) }} />
                {issue.current_status || "Unknown"}
              </span>
            </>
          )}
        />

        <section className="cs-panel px-6 py-6">
          <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Pipeline by status</h3>
          <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>Where the full tracker sits today.</p>
          <div className="mt-5 flex flex-col gap-4">
            {statusCounts.map((entry) => (
              <div key={entry.status}>
                <div className="flex items-center justify-between text-[12.5px]" style={{ color: "var(--app-text-body)" }}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(entry.status) }} />
                    {entry.status}
                  </span>
                  <span>{entry.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--app-surface-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(entry.count / maxStatusCount) * 100}%`, backgroundColor: statusColor(entry.status) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <IssueListPanel
        title="Blocked across the portfolio"
        subtitle="Every blocked item, with its owners, for the escalation conversation."
        entries={blocked.slice(0, 10)}
        onSelectIssue={onSelectIssue}
        emptyMessage="Nothing is blocked across the portfolio."
        renderMeta={(issue) => (
          <>
            <span>{accountSummary(issue)}</span>
            <span>•</span>
            <span>{issue.csm || "No CSM"} / {issue.pm || "No PM"}</span>
          </>
        )}
      />
    </div>
  );
}

export function RoleViewsView({ issues, onSelectIssue, operatorName }) {
  const [roleTab, setRoleTab] = useState(() => window.localStorage.getItem("cs-role-view-tab") || "csm");
  const [selectedCsm, setSelectedCsm] = useState(() => window.localStorage.getItem("cs-role-view-csm") || "");
  const [selectedPm, setSelectedPm] = useState(() => window.localStorage.getItem("cs-role-view-pm") || "");

  const csms = useMemo(
    () => [...new Set(issues.map((issue) => issue.csm).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [issues]
  );
  const pms = useMemo(
    () => [...new Set(issues.map((issue) => issue.pm).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [issues]
  );

  function changeTab(nextTab) {
    setRoleTab(nextTab);
    window.localStorage.setItem("cs-role-view-tab", nextTab);
  }

  function changeCsm(name) {
    setSelectedCsm(name);
    window.localStorage.setItem("cs-role-view-csm", name);
  }

  function changePm(name) {
    setSelectedPm(name);
    window.localStorage.setItem("cs-role-view-pm", name);
  }

  const effectiveCsm = selectedCsm || (csms.includes(operatorName) ? operatorName : "");
  const effectivePm = selectedPm || (pms.includes(operatorName) ? operatorName : "");

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <section className="cs-panel px-6 py-6">
        <SectionHeader
          eyebrow="Role views"
          title="Dashboards by role"
          subtitle="The same tracker, cut for how each role works: a CSM's book, a PM's pipeline, or the leadership review."
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {ROLE_TABS.map((tab) => {
              const active = roleTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  style={
                    active
                      ? { background: "var(--app-sidebar)", color: "#FAFAF7", borderColor: "var(--app-sidebar)" }
                      : { background: "var(--app-surface-2)", color: "var(--app-text-body)", borderColor: "var(--app-border)" }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {roleTab === "csm" ? (
            <PersonPicker label="CSM" people={csms} value={effectiveCsm} onChange={changeCsm} />
          ) : null}
          {roleTab === "pm" ? (
            <PersonPicker label="PM" people={pms} value={effectivePm} onChange={changePm} />
          ) : null}
        </div>
      </section>

      {roleTab === "csm" ? (
        effectiveCsm ? (
          <CsmDashboard issues={issues} csmName={effectiveCsm} onSelectIssue={onSelectIssue} />
        ) : (
          <section className="cs-panel px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
            Pick a CSM to see their book: active issues, risk, due dates, and revision checks.
          </section>
        )
      ) : null}

      {roleTab === "pm" ? (
        effectivePm ? (
          <PmDashboard issues={issues} pmName={effectivePm} onSelectIssue={onSelectIssue} />
        ) : (
          <section className="cs-panel px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
            Pick a PM to see their pipeline: discovery and review items, blockers, slipped ETAs, and handoff gaps.
          </section>
        )
      ) : null}

      {roleTab === "leadership" ? (
        <LeadershipDashboard issues={issues} onSelectIssue={onSelectIssue} />
      ) : null}
    </div>
  );
}
