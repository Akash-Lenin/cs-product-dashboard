import { useMemo, useState } from "react";
import { jiraBrowseUrl, jiraHandoffState } from "../lib/jira-handoff.js";

function parseIssueCreatedAt(issue) {
  const importKey = String(issue?.issue_import_key || "");
  if (importKey.startsWith("app_issue_")) {
    const timestamp = Number(importKey.replace("app_issue_", ""));
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  const historyTime = issue?.lastHistoryAt ? new Date(issue.lastHistoryAt).getTime() : Number.NaN;
  if (Number.isFinite(historyTime)) {
    return historyTime;
  }

  return null;
}

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

function ownerName(issue) {
  return issue.assignee_name || issue.revision_owner || issue.csm || issue.pm || "Unassigned";
}

function accountSummary(issue) {
  return (issue.accounts || []).map((account) => account.accountName).join(", ") || issue.account_name_raw || "No account";
}

export const ATTENTION_PROFILES = {
  operator: {
    label: "Operator",
    description: "Execution focus: overdue stages, blockers, missing owners, and stale updates rank highest.",
    weights: {
      red: 40,
      amber: 18,
      highPriority: 26,
      blocked: 24,
      stageOverdue: 24,
      stageDueSoon: 14,
      etaSlipped: 18,
      noAssignee: 14,
      stale: 12,
      veryStale: 20,
      highAcv: 10,
      revision: 12
    }
  },
  leadership: {
    label: "Leadership",
    description: "Risk and value focus: red health, slipped ETAs, and high-ACV exposure rank highest.",
    weights: {
      red: 45,
      amber: 20,
      highPriority: 20,
      blocked: 20,
      stageOverdue: 18,
      stageDueSoon: 8,
      etaSlipped: 24,
      noAssignee: 6,
      stale: 8,
      veryStale: 14,
      highAcv: 30,
      revision: 14
    }
  }
};

const STALE_THRESHOLD_OPTIONS = [7, 14, 21, 30];

export function isAttentionSnoozed(issue) {
  if (!issue.attention_snoozed_until) return false;
  const days = daysUntil(issue.attention_snoozed_until);
  return days !== null && days >= 0;
}

export function buildAttentionSignals(issue, weights, staleThresholdDays) {
  const signals = [];
  const stageDays = daysUntil(issue.stage_due_date);
  const etaDays = daysUntil(issue.resolution_eta);
  const staleDays = issue.lastHistoryAt
    ? Math.floor((Date.now() - new Date(issue.lastHistoryAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (issue.health === "Red") signals.push({ label: "Red health", weight: weights.red });
  if (issue.health === "Amber") signals.push({ label: "Amber health", weight: weights.amber });
  if (issue.priority === "High") signals.push({ label: "High priority", weight: weights.highPriority });
  if (issue.current_status === "Blocked") signals.push({ label: "Blocked", weight: weights.blocked });
  if (stageDays !== null && stageDays < 0) signals.push({ label: "Stage overdue", weight: weights.stageOverdue });
  if (stageDays !== null && stageDays >= 0 && stageDays <= 3) signals.push({ label: "Stage due soon", weight: weights.stageDueSoon });
  if (etaDays !== null && etaDays < 0) signals.push({ label: "ETA slipped", weight: weights.etaSlipped });
  if (!issue.assignee_name && issue.priority === "High") signals.push({ label: "No assignee", weight: weights.noAssignee });
  if (staleDays !== null && staleDays >= staleThresholdDays * 2) {
    signals.push({ label: `No update in ${staleDays}d`, weight: weights.veryStale });
  } else if (staleDays !== null && staleDays >= staleThresholdDays) {
    signals.push({ label: `No update in ${staleDays}d`, weight: weights.stale });
  }
  if (Number(issue.acv || 0) >= 100000) signals.push({ label: "High ACV", weight: weights.highAcv });
  if (issue.revision_owner || issue.revision_request) signals.push({ label: "Revision check open", weight: weights.revision });

  const score = signals.reduce((sum, signal) => sum + signal.weight, 0);
  return { score, signals };
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

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function NeedsAttentionView({ issues, onSelectIssue, onQuickUpdate, operatorName }) {
  const [mode, setMode] = useState(() => window.localStorage.getItem("cs-attention-mode") || "operator");
  const [staleThreshold, setStaleThreshold] = useState(() => {
    const stored = Number(window.localStorage.getItem("cs-attention-stale-days"));
    return STALE_THRESHOLD_OPTIONS.includes(stored) ? stored : 14;
  });
  const [snoozingKey, setSnoozingKey] = useState(null);
  const [snoozeError, setSnoozeError] = useState("");

  function changeMode(nextMode) {
    setMode(nextMode);
    window.localStorage.setItem("cs-attention-mode", nextMode);
  }

  function changeStaleThreshold(nextValue) {
    setStaleThreshold(nextValue);
    window.localStorage.setItem("cs-attention-stale-days", String(nextValue));
  }

  async function handleSnooze(issue, days) {
    setSnoozingKey(issue.issue_import_key);
    setSnoozeError("");
    try {
      await onQuickUpdate(issue.issue_import_key, {
        attention_snoozed_until: days === null ? "" : addDaysIso(days),
        attention_snoozed_by: days === null ? "" : operatorName || "CS Dashboard"
      });
    } catch (error) {
      setSnoozeError(error?.message || "Snooze failed. If the column is missing, run the attention snooze migration.");
    } finally {
      setSnoozingKey(null);
    }
  }

  const profile = ATTENTION_PROFILES[mode] || ATTENTION_PROFILES.operator;

  const snoozedIssues = issues.filter(isAttentionSnoozed);

  const attentionIssues = issues
    .filter((issue) => !isAttentionSnoozed(issue))
    .map((issue) => ({ issue, ...buildAttentionSignals(issue, profile.weights, staleThreshold) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || Number(right.issue.acv || 0) - Number(left.issue.acv || 0))
    .slice(0, 18);

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <section className="cs-panel px-6 py-6">
        <SectionHeader
          eyebrow="Attention board"
          title="Needs attention"
          subtitle={profile.description}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {Object.entries(ATTENTION_PROFILES).map(([key, entry]) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeMode(key)}
                  className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  style={
                    active
                      ? { background: "var(--app-sidebar)", color: "#FAFAF7", borderColor: "var(--app-sidebar)" }
                      : { background: "var(--app-surface-2)", color: "var(--app-text-body)", borderColor: "var(--app-border)" }
                  }
                >
                  {entry.label}
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "var(--app-text-muted)" }}>
            Stale after
            <select
              value={staleThreshold}
              onChange={(event) => changeStaleThreshold(Number(event.target.value))}
              className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--app-text-body)] outline-none"
            >
              {STALE_THRESHOLD_OPTIONS.map((days) => (
                <option key={days} value={days}>{days} days</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "High-risk items",
              value: attentionIssues.filter((entry) => entry.issue.health === "Red" || entry.issue.current_status === "Blocked").length
            },
            {
              label: "Overdue stages",
              value: attentionIssues.filter((entry) => {
                const diff = daysUntil(entry.issue.stage_due_date);
                return diff !== null && diff < 0;
              }).length
            },
            {
              label: "Stale updates",
              value: attentionIssues.filter((entry) => entry.signals.some((signal) => signal.label.startsWith("No update"))).length
            }
          ].map((card) => (
            <div key={card.label} className="rounded-[12px] border px-4 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
              <div className="text-[12px] font-semibold" style={{ color: "var(--app-text-muted)" }}>{card.label}</div>
              <div className="mt-3 text-[30px] font-bold" style={{ color: "var(--app-text)" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      {snoozeError ? (
        <div className="cs-panel px-5 py-4 text-sm text-[#842A42]">{snoozeError}</div>
      ) : null}

      <section className="cs-panel overflow-hidden">
        <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
          <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Priority stack</h3>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
          {attentionIssues.length ? attentionIssues.map(({ issue, score, signals }) => (
            <div key={issue.issue_import_key} className="flex items-stretch">
              <button
                type="button"
                onClick={() => onSelectIssue(issue)}
                className="grid min-w-0 flex-1 gap-5 px-6 py-5 text-left transition hover:bg-[var(--app-surface-2)] lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    <span className="font-semibold" style={{ color: "var(--app-text-body)" }}>{issue.jira_ticket || issue.issue_import_key}</span>
                    <span>•</span>
                    <span>{accountSummary(issue)}</span>
                  </div>
                  <div className="mt-2 text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {signals.slice(0, 4).map((signal) => (
                      <span
                        key={`${issue.issue_import_key}-${signal.label}`}
                        className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                        style={{ background: "var(--app-surface-2)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}
                      >
                        {signal.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-[12px] border px-4 py-4 text-[12px]" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Score</div>
                    <div className="mt-1 text-[22px] font-bold" style={{ color: "var(--app-text)" }}>{score}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Owner</div>
                    <div className="mt-1" style={{ color: "var(--app-text-body)" }}>{ownerName(issue)}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Status</div>
                    <div className="mt-1 inline-flex items-center gap-2" style={{ color: "var(--app-text-body)" }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(issue.current_status) }} />
                      {issue.current_status || "Unknown"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Stage due</div>
                    <div className="mt-1" style={{ color: "var(--app-text-body)" }}>{formatDateLabel(issue.stage_due_date)}</div>
                  </div>
                </div>
              </button>

              <div className="flex items-center border-l px-4" style={{ borderColor: "var(--app-border)" }}>
                <select
                  value=""
                  disabled={snoozingKey === issue.issue_import_key}
                  onChange={(event) => {
                    const days = Number(event.target.value);
                    if (days) handleSnooze(issue, days);
                  }}
                  className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--app-text-body)] outline-none"
                  title="Snooze this issue off the attention board"
                >
                  <option value="">Snooze…</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            </div>
          )) : (
            <div className="px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
              Nothing needs attention with the current tuning.
            </div>
          )}
        </div>
      </section>

      {snoozedIssues.length ? (
        <section className="cs-panel overflow-hidden">
          <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
            <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Snoozed</h3>
            <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>
              These items are off the attention board until their snooze date passes.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
            {snoozedIssues.map((issue) => (
              <div key={`${issue.issue_import_key}-snoozed`} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onSelectIssue(issue)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-[14px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    Snoozed until {formatDateLabel(issue.attention_snoozed_until)}
                    {issue.attention_snoozed_by ? ` by ${issue.attention_snoozed_by}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  disabled={snoozingKey === issue.issue_import_key}
                  onClick={() => handleSnooze(issue, null)}
                  className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-40"
                  style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
                >
                  Unsnooze
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const PENDING_LANES = [
  { key: "all", label: "All pending" },
  { key: "mine", label: "My queue" },
  { key: "due_week", label: "Due this week" },
  { key: "blocked", label: "Blocked" },
  { key: "waiting_pm", label: "Waiting on PM" },
  { key: "revision", label: "Revision checks" }
];

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function issueMatchesPerson(issue, personName) {
  const person = normalizeName(personName);
  if (!person) return false;
  return [issue.assignee_name, issue.csm, issue.pm, issue.revision_owner].some(
    (field) => normalizeName(field) === person
  );
}

function entryMatchesLane(entry, laneKey, operatorName) {
  const { issue, dueDays } = entry;

  if (laneKey === "mine") return issueMatchesPerson(issue, operatorName);
  if (laneKey === "due_week") return dueDays !== null && dueDays <= 7;
  if (laneKey === "blocked") return issue.current_status === "Blocked";
  if (laneKey === "waiting_pm") return ["In Discovery", "Under Review", "Planned"].includes(issue.current_status);
  if (laneKey === "revision") return Boolean(issue.revision_owner || issue.revision_request);
  return true;
}

export function PendingView({ issues, onSelectIssue, operatorName }) {
  const [laneKey, setLaneKey] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");

  const pendingIssues = useMemo(() => {
    return [...issues]
      .filter((issue) => issue.current_status !== "Released")
      .map((issue) => {
        const dueDays = daysUntil(issue.stage_due_date);
        const etaDays = daysUntil(issue.resolution_eta);
        const rank =
          (issue.priority === "High" ? 35 : issue.priority === "Medium" ? 18 : 6) +
          (issue.health === "Red" ? 28 : issue.health === "Amber" ? 14 : 4) +
          (dueDays !== null && dueDays < 0 ? 22 : dueDays !== null && dueDays <= 7 ? 14 : 0) +
          (etaDays !== null && etaDays < 0 ? 12 : 0) +
          (issue.current_status === "Blocked" ? 18 : 0);

        return { issue, dueDays, etaDays, rank };
      })
      .sort((left, right) => right.rank - left.rank || Number(right.issue.acv || 0) - Number(left.issue.acv || 0));
  }, [issues]);

  const owners = useMemo(() => {
    const names = pendingIssues.flatMap(({ issue }) => [issue.assignee_name, issue.csm, issue.pm]);
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [pendingIssues]);

  const laneCounts = useMemo(() => {
    return Object.fromEntries(
      PENDING_LANES.map((lane) => [
        lane.key,
        pendingIssues.filter((entry) => entryMatchesLane(entry, lane.key, operatorName)).length
      ])
    );
  }, [pendingIssues, operatorName]);

  const visibleEntries = pendingIssues
    .filter((entry) => entryMatchesLane(entry, laneKey, operatorName))
    .filter((entry) => !ownerFilter || issueMatchesPerson(entry.issue, ownerFilter));

  const dueNowCount = pendingIssues.filter((entry) => entry.dueDays !== null && entry.dueDays <= 7).length;
  const revisionCount = pendingIssues.filter((entry) => entry.issue.revision_owner || entry.issue.revision_request).length;

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <section className="cs-panel px-6 py-6">
        <SectionHeader
          eyebrow="Work queue"
          title="Pending"
          subtitle="Saved lanes over the same urgency-ranked queue: your own items, near-term due dates, blockers, product waits, and revision checks."
        />

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending items", value: pendingIssues.length },
            { label: "Due in 7 days", value: dueNowCount },
            { label: "Blocked", value: laneCounts.blocked },
            { label: "Revision checks", value: revisionCount }
          ].map((card) => (
            <div key={card.label} className="rounded-[12px] border px-4 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
              <div className="text-[12px] font-semibold" style={{ color: "var(--app-text-muted)" }}>{card.label}</div>
              <div className="mt-3 text-[28px] font-bold" style={{ color: "var(--app-text)" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cs-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: "var(--app-border)" }}>
          <div className="flex flex-wrap gap-2">
            {PENDING_LANES.map((lane) => {
              const active = laneKey === lane.key;
              return (
                <button
                  key={lane.key}
                  type="button"
                  onClick={() => setLaneKey(lane.key)}
                  className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  style={
                    active
                      ? { background: "var(--app-sidebar)", color: "#FAFAF7", borderColor: "var(--app-sidebar)" }
                      : { background: "var(--app-surface-2)", color: "var(--app-text-body)", borderColor: "var(--app-border)" }
                  }
                >
                  {lane.label} · {laneCounts[lane.key]}
                </button>
              );
            })}
          </div>

          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--app-text-body)] outline-none"
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </div>

        {laneKey === "mine" && !operatorName ? (
          <div className="border-b px-6 py-4 text-[13px]" style={{ borderColor: "var(--app-border)", color: "var(--app-text-muted)" }}>
            My queue matches items where you are the assignee, CSM, PM, or revision owner. Set your operator name to use it.
          </div>
        ) : null}

        <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
          {visibleEntries.length ? (
            visibleEntries.slice(0, 24).map(({ issue, dueDays, rank }) => {
              const handoff = jiraHandoffState(issue);
              return (
                <button
                  key={issue.issue_import_key}
                  type="button"
                  onClick={() => onSelectIssue(issue)}
                  className="grid w-full gap-4 px-6 py-4 text-left transition hover:bg-[var(--app-surface-2)] lg:grid-cols-[minmax(0,1.4fr)_0.8fr_0.6fr_0.6fr]"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                      <span>{accountSummary(issue)}</span>
                      <span>•</span>
                      <span>{ownerName(issue)}</span>
                      {issue.current_status === "Blocked" ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#F8DAE2", color: "#842A42" }}>
                          Blocked
                        </span>
                      ) : null}
                      {issue.revision_owner || issue.revision_request ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#FEEADC", color: "#8E5E48" }}>
                          Revision check
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--app-text-body)" }}>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Stage due</div>
                    <div className="mt-1">{formatDateLabel(issue.stage_due_date)}</div>
                    <div className="mt-1">
                      {dueDays === null ? "No due date" : dueDays < 0 ? `${Math.abs(dueDays)}d overdue` : `${dueDays}d left`}
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--app-text-body)" }}>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Jira handoff</div>
                    <div className="mt-1">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: handoff.background, color: handoff.color }}>
                        {handoff.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--app-text-body)" }}>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Urgency score</div>
                    <div className="mt-1 text-[22px] font-bold" style={{ color: "var(--app-text)" }}>{rank}</div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
              Nothing in this lane right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const quickInputClass =
  "rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[12px] text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]";

function QuickTriageBar({ issue, busy, onQuickUpdate, onSendToJira, jiraConfig }) {
  const [assigneeDraft, setAssigneeDraft] = useState(issue.assignee_name || "");
  const [error, setError] = useState("");

  async function runQuickUpdate(updates) {
    setError("");
    try {
      await onQuickUpdate(issue.issue_import_key, updates);
    } catch (updateError) {
      setError(updateError?.message || "Quick update failed.");
    }
  }

  async function handleSendToJira() {
    setError("");
    try {
      await onSendToJira(issue.issue_import_key);
    } catch (sendError) {
      setError(sendError?.message || "Could not create the PRDF in Jira.");
    }
  }

  const browseUrl = jiraBrowseUrl(jiraConfig?.jiraBaseUrl, issue.jira_ticket);

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>
        Quick triage
      </span>

      <select
        value={issue.priority || ""}
        disabled={busy}
        onChange={(event) => runQuickUpdate({ priority: event.target.value })}
        className={quickInputClass}
        title="Set priority"
      >
        <option value="">Priority</option>
        {["High", "Medium", "Low"].map((priority) => (
          <option key={priority} value={priority}>{priority}</option>
        ))}
      </select>

      <input
        type="date"
        value={issue.stage_due_date || ""}
        disabled={busy}
        onChange={(event) => runQuickUpdate({ stage_due_date: event.target.value })}
        className={quickInputClass}
        title="Set stage due date"
      />

      <span className="inline-flex items-center gap-1.5">
        <input
          value={assigneeDraft}
          disabled={busy}
          onChange={(event) => setAssigneeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runQuickUpdate({ assignee_name: assigneeDraft });
            }
          }}
          placeholder="Assign owner"
          className={`${quickInputClass} w-[140px]`}
        />
        <button
          type="button"
          disabled={busy || normalizeName(assigneeDraft) === normalizeName(issue.assignee_name)}
          onClick={() => runQuickUpdate({ assignee_name: assigneeDraft })}
          className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold transition disabled:opacity-40"
          style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
        >
          Set
        </button>
      </span>

      {issue.jira_ticket ? (
        browseUrl ? (
          <a
            href={browseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold"
            style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
          >
            Open {issue.jira_ticket}
          </a>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>{issue.jira_ticket}</span>
        )
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={handleSendToJira}
          className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold transition disabled:opacity-40"
          style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
        >
          {busy ? "Working…" : "Send to Jira"}
        </button>
      )}

      {error ? <span className="text-[12px] text-[#842A42]">{error}</span> : null}
    </div>
  );
}

export function RecentlyAddedView({ issues, onSelectIssue, onQuickUpdate, onSendToJira, jiraConfig }) {
  const [busyIssueKey, setBusyIssueKey] = useState(null);

  async function wrapBusy(issueImportKey, action) {
    setBusyIssueKey(issueImportKey);
    try {
      await action();
    } finally {
      setBusyIssueKey(null);
    }
  }

  const recentIssues = [...issues]
    .sort((left, right) => {
      const rightCreated = parseIssueCreatedAt(right);
      const leftCreated = parseIssueCreatedAt(left);
      if (rightCreated !== null && leftCreated !== null) {
        return rightCreated - leftCreated;
      }
      if (rightCreated !== null) return 1;
      if (leftCreated !== null) return -1;
      return Number(right.source_row_number || 0) - Number(left.source_row_number || 0);
    })
    .slice(0, 20);

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <section className="cs-panel px-6 py-6">
        <SectionHeader
          eyebrow="Fresh intake"
          title="Recently added"
          subtitle="A quick triage feed for the latest tracker additions, PRDF links, and newly surfaced asks."
        />

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Recent items shown", value: recentIssues.length },
            { label: "Created in app", value: recentIssues.filter((issue) => String(issue.issue_import_key).startsWith("app_issue_")).length },
            { label: "With PRDF key", value: recentIssues.filter((issue) => issue.jira_ticket).length },
            { label: "Still open", value: recentIssues.filter((issue) => issue.current_status === "Open").length }
          ].map((card) => (
            <div key={card.label} className="rounded-[12px] border px-4 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
              <div className="text-[12px] font-semibold" style={{ color: "var(--app-text-muted)" }}>{card.label}</div>
              <div className="mt-3 text-[28px] font-bold" style={{ color: "var(--app-text)" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cs-panel overflow-hidden">
        <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
          <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Recent intake feed</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
          {recentIssues.map((issue) => {
            const createdAt = parseIssueCreatedAt(issue);
            const isAppCreated = String(issue.issue_import_key).startsWith("app_issue_");
            const handoff = jiraHandoffState(issue);
            return (
              <div key={issue.issue_import_key}>
                <button
                  type="button"
                  onClick={() => onSelectIssue(issue)}
                  className="grid w-full gap-4 px-6 py-4 text-left transition hover:bg-[var(--app-surface-2)] lg:grid-cols-[minmax(0,1.2fr)_0.8fr_0.7fr]"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                      <span>{accountSummary(issue)} • {issue.jira_ticket || issue.issue_import_key}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: handoff.background, color: handoff.color }}>
                        {handoff.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--app-text-body)" }}>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Source</div>
                    <div className="mt-1">{isAppCreated ? "Created in dashboard" : "Imported tracker record"}</div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--app-text-body)" }}>
                    <div className="font-semibold uppercase tracking-[0.07em]" style={{ color: "var(--app-text-muted)" }}>Latest marker</div>
                    <div className="mt-1">{createdAt !== null ? formatDateLabel(createdAt) : `Imported row ${issue.source_row_number || "unknown"}`}</div>
                  </div>
                </button>
                <QuickTriageBar
                  issue={issue}
                  busy={busyIssueKey === issue.issue_import_key}
                  jiraConfig={jiraConfig}
                  onQuickUpdate={(issueKey, updates) => wrapBusy(issueKey, () => onQuickUpdate(issueKey, updates))}
                  onSendToJira={(issueKey) => wrapBusy(issueKey, () => onSendToJira(issueKey))}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
