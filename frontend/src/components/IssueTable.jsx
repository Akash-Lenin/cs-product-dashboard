import { jiraHandoffState } from "../lib/jira-handoff.js";

function formatAcvCompact(value) {
  if (!value) {
    return "$0";
  }

  const number = Number(value);
  if (number >= 1000000) {
    return `$${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  }
  if (number >= 1000) {
    return `$${Math.round(number / 1000)}k`;
  }
  return `$${number}`;
}

function initialsFromName(name) {
  const words = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "NA";
  }

  return words.map((word) => word[0]).join("").toUpperCase();
}

function ownerColor(name) {
  const map = {
    "Priya Nair": "#5F7FF4",
    "Marcus Reid": "#188874",
    "Elena Fischer": "#B2755A",
    "Dev Sharma": "#C67840",
    "Tom Whitfield": "#B03858"
  };

  return map[name] || "#57514A";
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

function priorityPill(priority) {
  if (priority === "High") return { background: "#F8DAE2", color: "#842A42" };
  if (priority === "Medium") return { background: "#FEEADC", color: "#8E5E48" };
  return { background: "#F3F1EC", color: "#57514A" };
}

export function IssueTable({ issues, loading, onSelectIssue }) {
  if (loading) {
    return <div className="px-6 py-14 text-center text-sm text-[var(--app-text-muted)]">Loading issues...</div>;
  }

  if (!issues.length) {
    return (
      <div className="px-6 py-14 text-center text-sm text-[var(--app-text-muted)]">
        No issues match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[960px]">
        <div
          className="grid gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface-2)] px-6 py-3"
          style={{ gridTemplateColumns: "minmax(280px,1.9fr) 1.3fr 1fr 0.8fr 1fr 0.9fr" }}
        >
          {["Issue", "Accounts", "Owner", "Priority", "Status", "ACV · Renewal"].map((label, index) => (
            <div
              key={label}
              className={`text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--app-text-muted)] ${
                index === 5 ? "text-right" : ""
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {issues.map((issue) => {
          const chips = issue.accounts || [];
          const visibleAccounts = chips.slice(0, 2);
          const ownerName = issue.assignee_name || issue.csm || "Unassigned";
          const pill = priorityPill(issue.priority);

          return (
            <button
              key={issue.issue_import_key}
              type="button"
              onClick={() => onSelectIssue(issue)}
              className="grid w-full items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-4 text-left transition hover:bg-[var(--app-surface-2)]"
              style={{ gridTemplateColumns: "minmax(280px,1.9fr) 1.3fr 1fr 0.8fr 1fr 0.9fr" }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: healthColor(issue.health) }} />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[var(--app-text)]">{issue.issue_title}</div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--app-text-muted)]">
                    <span className="font-semibold">{issue.jira_ticket || issue.issue_import_key}</span>
                    <span>·</span>
                    <span className="truncate max-w-[230px]">{issue.business_impact || "No business impact captured yet."}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {visibleAccounts.map((account) => (
                  <span
                    key={`${issue.issue_import_key}-${account.accountKey}`}
                    className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--app-text-body)]"
                  >
                    {account.accountName}
                  </span>
                ))}
                {chips.length > 2 ? (
                  <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--app-text-muted)]">
                    +{chips.length - 2}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: ownerColor(ownerName) }}
                >
                  {initialsFromName(ownerName)}
                </span>
                <span className="truncate text-[13px] text-[var(--app-text-body)]">{ownerName}</span>
              </div>

              <div>
                <span
                  className="inline-flex rounded-full px-3 py-1 text-[11.5px] font-semibold tracking-[0.02em]"
                  style={{ background: pill.background, color: pill.color }}
                >
                  {issue.priority || "Low"}
                </span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 text-[13px] text-[var(--app-text-body)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(issue.current_status) }} />
                  <span>{issue.current_status || "Planned"}</span>
                </div>
                {(() => {
                  const handoff = jiraHandoffState(issue);
                  return (
                    <div className="mt-1.5">
                      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: handoff.background, color: handoff.color }}>
                        {handoff.shortLabel}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="text-right">
                <div className="text-[14px] font-semibold text-[var(--app-text)]">{formatAcvCompact(issue.acv)}</div>
                <div className="mt-0.5 text-[12px] text-[var(--app-text-muted)]">{issue.renewal_date || "No renewal"}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
