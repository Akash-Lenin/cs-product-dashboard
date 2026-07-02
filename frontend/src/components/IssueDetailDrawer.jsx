import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { jiraBrowseUrl, jiraHandoffState } from "../lib/jira-handoff.js";

const EMPTY_ISSUE = {
  issue_import_key: "",
  issue_title: "",
  health: "",
  priority: "",
  current_status: "",
  jira_ticket: "",
  business_impact: "",
  accounts: [],
  acv: "",
  csm: "",
  pm: "",
  assignee_name: "",
  renewal_date: "",
  stage_due_date: "",
  resolution_eta: "",
  dev_jira_ticket: "",
  support_ticket: "",
  revision_owner: "",
  revision_request: "",
  customers_affected: "",
  next_steps: "",
  meeting_notes: "",
  product_feedback: "",
  updated_by: ""
};

function formatAcv(value) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value));
}

function formatHistoryTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatRelativeTime(value) {
  if (!value) return "recently";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "recently";
  const diff = Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function initialsFromName(name) {
  const words = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "NA";
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

function InputField({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-sm text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-sm text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-sm leading-6 text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-sm text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
      >
        <option value="">Unset</option>
        {(options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildFormState(issue) {
  return {
    assignee_name: issue.assignee_name || "",
    stage_due_date: issue.stage_due_date || "",
    dev_jira_ticket: issue.dev_jira_ticket || "",
    csm: issue.csm || "",
    pm: issue.pm || "",
    health: issue.health || "",
    priority: issue.priority || "",
    current_status: issue.current_status || "",
    renewal_date: issue.renewal_date || "",
    resolution_eta: issue.resolution_eta || "",
    support_ticket: issue.support_ticket || "",
    revision_owner: issue.revision_owner || "",
    revision_request: issue.revision_request || "",
    customers_affected: issue.customers_affected || "",
    next_steps: issue.next_steps || "",
    meeting_notes: issue.meeting_notes || "",
    product_feedback: issue.product_feedback || ""
  };
}

function MetaCell({ label, value, iconColor }) {
  return (
    <div className="bg-[var(--app-surface)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--app-text-body)]">
        {iconColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: iconColor }} /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function HistoryItem({ entry, isLatest, onOpenMeeting }) {
  return (
    <div className="relative flex gap-4 pb-4">
      <div className="flex w-4 flex-col items-center">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isLatest ? "var(--status-development)" : "var(--app-border-strong)" }} />
        <span className="mt-1 min-h-[42px] w-px flex-1 bg-[var(--app-border)]" />
      </div>
      <div className="pt-0.5">
        <div className="text-[13.5px] font-semibold text-[var(--app-text)]">
          {entry.entry_type === "state_change" ? "Issue updated" : "Meeting note added"}
        </div>
        <div className="mt-1 text-[12px] text-[var(--app-text-muted)]">
          {entry.author_name || "CS Dashboard"} · {formatHistoryTime(entry.created_at)}
        </div>
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--app-text-body)]">{entry.body}</div>
        {entry.meeting_id && onOpenMeeting ? (
          <button
            type="button"
            onClick={() => onOpenMeeting(entry.meeting_id)}
            className="mt-2 text-[12px] font-semibold underline underline-offset-2 text-[var(--app-text-body)]"
          >
            View in Meeting space
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function IssueDetailDrawer({
  issue,
  filterOptions,
  operatorName,
  saving,
  deleting,
  jiraBaseUrl,
  jiraPrdfCreateUrl,
  onClose,
  onSave,
  onDelete,
  onOpenMeeting
}) {
  const safeIssue = issue || EMPTY_ISSUE;
  const [form, setForm] = useState(buildFormState(safeIssue));
  const [issueUpdates, setIssueUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [historyEnabled, setHistoryEnabled] = useState(true);

  useEffect(() => {
    setForm(buildFormState(safeIssue));
    setSaveMessage("");
    setDeleteReason("");
    setDeleteMessage("");
  }, [issue]);

  useEffect(() => {
    let cancelled = false;

    if (!issue?.issue_import_key) {
      setIssueUpdates([]);
      return () => {
        cancelled = true;
      };
    }

    async function loadUpdates() {
      setUpdatesLoading(true);
      try {
        const response = await apiFetch(`/api/issues/${issue.issue_import_key}/updates`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || `History failed: ${response.status}`);
        }
        if (cancelled) return;
        setHistoryEnabled(payload.historyEnabled !== false);
        setIssueUpdates(payload.updates || []);
      } catch {
        if (!cancelled) {
          setHistoryEnabled(false);
          setIssueUpdates([]);
        }
      } finally {
        if (!cancelled) {
          setUpdatesLoading(false);
        }
      }
    }

    loadUpdates();

    return () => {
      cancelled = true;
    };
  }, [issue?.issue_import_key]);

  if (!issue) {
    return null;
  }

  const pill = priorityPill(issue.priority);
  const latestHistory = issueUpdates[0];
  const ownerPrimary = issue.assignee_name || issue.csm || operatorName || "Riya Ahuja";
  const ownerSecondary = issue.pm || "Product partner";

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await onSave(issue.issue_import_key, form);
      setSaveMessage("Issue workspace updated");
    } catch {
      setSaveMessage("Save failed");
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Move this issue to the review bin?");
    if (!confirmed) {
      return;
    }

    try {
      await onDelete(issue.issue_import_key, { delete_reason: deleteReason });
      setDeleteMessage("Issue moved to review bin");
    } catch {
      setDeleteMessage("Delete failed");
    }
  }

  function openInJira() {
    if (issue?.jira_ticket && jiraBaseUrl) {
      window.open(`${jiraBaseUrl.replace(/\/+$/, "")}/browse/${issue.jira_ticket}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (jiraPrdfCreateUrl) {
      window.open(jiraPrdfCreateUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(28,9,19,0.5)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close issue drawer"
      />

      <aside className="absolute right-0 top-0 h-full w-[480px] max-w-[92vw] overflow-hidden bg-[var(--app-surface)] shadow-[var(--app-shadow-lg)]">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-[var(--app-border)] px-6 py-5">
            <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: healthColor(issue.health) }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[var(--app-text-muted)]">{issue.jira_ticket || issue.issue_import_key}</span>
                <span
                  className="inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ background: pill.background, color: pill.color }}
                >
                  {issue.priority || "Low"}
                </span>
              </div>
              <h2 className="mt-3 text-[20px] font-semibold leading-[1.3] text-[var(--app-text)]">{issue.issue_title}</h2>
              <div className="mt-4 flex items-center gap-2 text-[12.5px] text-[var(--app-text-muted)]">
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: ownerColor(ownerPrimary) }}
                >
                  {initialsFromName(ownerPrimary)}
                </span>
                <span>
                  Last updated by <strong className="text-[var(--app-text-body)]">{latestHistory?.author_name || ownerPrimary}</strong> ·{" "}
                  {formatRelativeTime(latestHistory?.created_at)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-body)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="m6 6 12 12" />
                <path d="m18 6-12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Business impact</div>
              <p className="mt-3 text-[14.5px] leading-7 text-[var(--app-text-body)]">
                {issue.business_impact || "No business impact captured yet."}
              </p>
            </section>

            <section className="mt-6 overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-border)]">
              <div className="grid gap-px md:grid-cols-2">
                <MetaCell label="Health" value={issue.health || "Unknown"} iconColor={healthColor(issue.health)} />
                <MetaCell label="Status" value={issue.current_status || "Planned"} iconColor={statusColor(issue.current_status)} />
                <MetaCell label="Tracked ACV" value={formatAcv(issue.acv)} />
                <MetaCell label="Renewal" value={issue.renewal_date || "Not set"} />
              </div>
            </section>

            <section className="mt-6 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Jira handoff</div>
                {(() => {
                  const handoff = jiraHandoffState(issue);
                  return (
                    <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: handoff.background, color: handoff.color }}>
                      {handoff.label}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-[var(--app-text-muted)]">PRDF ticket</span>
                  {issue.jira_ticket ? (
                    jiraBrowseUrl(jiraBaseUrl, issue.jira_ticket) ? (
                      <a
                        href={jiraBrowseUrl(jiraBaseUrl, issue.jira_ticket)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[var(--app-text-body)] underline underline-offset-2"
                      >
                        {issue.jira_ticket}
                      </a>
                    ) : (
                      <span className="font-semibold text-[var(--app-text-body)]">{issue.jira_ticket}</span>
                    )
                  ) : (
                    <span className="text-[var(--app-text-muted)]">Not created</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-[var(--app-text-muted)]">Dev ticket</span>
                  {issue.dev_jira_ticket ? (
                    jiraBrowseUrl(jiraBaseUrl, issue.dev_jira_ticket) ? (
                      <a
                        href={jiraBrowseUrl(jiraBaseUrl, issue.dev_jira_ticket)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[var(--app-text-body)] underline underline-offset-2"
                      >
                        {issue.dev_jira_ticket}
                      </a>
                    ) : (
                      <span className="font-semibold text-[var(--app-text-body)]">{issue.dev_jira_ticket}</span>
                    )
                  ) : (
                    <span className="text-[var(--app-text-muted)]">Pending</span>
                  )}
                </div>
              </div>

              {!issue.jira_ticket && jiraPrdfCreateUrl ? (
                <button
                  type="button"
                  onClick={() => window.open(jiraPrdfCreateUrl, "_blank", "noopener,noreferrer")}
                  className="mt-4 w-full rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--app-text-body)]"
                >
                  Create PRDF in Jira
                </button>
              ) : null}
            </section>

            {issue.meeting_notes ? (
              <section className="mt-6 rounded-[10px] border border-[var(--app-border)] border-l-[3px] border-l-[#41192D] bg-[var(--app-surface-2)] px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Last meeting update
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--app-text-body)]">{issue.meeting_notes}</p>
                <div className="mt-3 text-[12px] text-[var(--app-text-muted)]">
                  Logged by {latestHistory?.author_name || issue.csm || ownerPrimary} · CS × Product Sync
                </div>
              </section>
            ) : null}

            <section className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Accounts affected</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(issue.accounts || []).map((account) => (
                  <span
                    key={`${issue.issue_import_key}-${account.accountKey}`}
                    className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-text-body)]"
                  >
                    {account.accountName}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Owners</div>
              <div className="mt-4 space-y-4">
                {[{ name: ownerPrimary, role: "Customer Success Manager" }, { name: ownerSecondary, role: "Product Manager" }].map((owner) => (
                  <div key={owner.role} className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: ownerColor(owner.name) }}
                    >
                      {initialsFromName(owner.name)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--app-text)]">{owner.name}</div>
                      <div className="text-[12px] text-[var(--app-text-muted)]">{owner.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {issue.resolution_eta ? (
              <section className="mt-6 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-4">
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C67840" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Resolution ETA</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--app-text-body)]">{issue.resolution_eta}</div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Ownership workspace</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InputField label="Primary assignee" value={form.assignee_name} onChange={(value) => setForm((current) => ({ ...current, assignee_name: value }))} />
                <DateField label="Stage due date" value={form.stage_due_date} onChange={(value) => setForm((current) => ({ ...current, stage_due_date: value }))} />
                <InputField label="CSM" value={form.csm} onChange={(value) => setForm((current) => ({ ...current, csm: value }))} />
                <InputField label="PM" value={form.pm} onChange={(value) => setForm((current) => ({ ...current, pm: value }))} />
                <InputField label="Dev Jira ticket" value={form.dev_jira_ticket} onChange={(value) => setForm((current) => ({ ...current, dev_jira_ticket: value }))} />
                <InputField label="Support ticket" value={form.support_ticket} onChange={(value) => setForm((current) => ({ ...current, support_ticket: value }))} />
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Status and revision checks</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectField label="Health" value={form.health} onChange={(value) => setForm((current) => ({ ...current, health: value }))} options={filterOptions?.health} />
                <SelectField label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={filterOptions?.priorities} />
                <SelectField label="Current status" value={form.current_status} onChange={(value) => setForm((current) => ({ ...current, current_status: value }))} options={filterOptions?.currentStatuses} />
                <DateField label="Resolution ETA" value={form.resolution_eta} onChange={(value) => setForm((current) => ({ ...current, resolution_eta: value }))} />
                <InputField label="Revision owner" value={form.revision_owner} onChange={(value) => setForm((current) => ({ ...current, revision_owner: value }))} />
                <InputField label="Review ask" value={form.revision_request} onChange={(value) => setForm((current) => ({ ...current, revision_request: value }))} placeholder="ACV check, ETA check, etc." />
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Workspace notes</div>
              <div className="mt-4 grid gap-4">
                <InputField label="Customers affected" value={form.customers_affected} onChange={(value) => setForm((current) => ({ ...current, customers_affected: value }))} />
                <TextAreaField label="Next steps" value={form.next_steps} onChange={(value) => setForm((current) => ({ ...current, next_steps: value }))} rows={3} />
                <TextAreaField label="Meeting note" value={form.meeting_notes} onChange={(value) => setForm((current) => ({ ...current, meeting_notes: value }))} rows={4} />
                <TextAreaField label="Product feedback" value={form.product_feedback} onChange={(value) => setForm((current) => ({ ...current, product_feedback: value }))} rows={4} />
              </div>
            </section>

            <section className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--app-text-muted)]">Activity history</div>
              <div className="mt-4">
                {updatesLoading ? (
                  <div className="text-sm text-[var(--app-text-muted)]">Loading activity...</div>
                ) : issueUpdates.length ? (
                  issueUpdates.map((entry, index) => (
                    <HistoryItem key={entry.id} entry={entry} isLatest={index === 0} onOpenMeeting={onOpenMeeting} />
                  ))
                ) : (
                  <div className="text-sm text-[var(--app-text-muted)]">
                    {historyEnabled ? "No activity captured yet." : "History is not available yet."}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[rgba(132,42,66,0.18)] bg-[#FFF5F7] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#842A42]">Delete workflow</div>
              <div className="mt-2 text-[13px] leading-6 text-[#842A42]">
                Move this issue into the review bin first. It can be restored later or deleted permanently after review.
              </div>
              <div className="mt-4">
                <TextAreaField
                  label="Delete reason"
                  value={deleteReason}
                  onChange={setDeleteReason}
                  rows={3}
                  placeholder="Why is this issue being removed from the active tracker?"
                />
              </div>
              {deleteMessage ? <div className="mt-3 text-[12px] text-[#842A42]">{deleteMessage}</div> : null}
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="mt-4 w-full border border-[rgba(132,42,66,0.28)] bg-white px-4 py-3 text-[13px] font-semibold text-[#842A42] disabled:opacity-60"
              >
                {deleting ? "Moving to review bin..." : "Move to review bin"}
              </button>
            </section>
          </div>

          <div className="border-t border-[var(--app-border)] px-6 py-4">
            {saveMessage ? <div className="mb-3 text-[12px] text-[var(--app-text-muted)]">{saveMessage}</div> : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[var(--app-sidebar)] px-4 py-3 text-[13px] font-semibold text-[#FAFAF7] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update status"}
              </button>
              <button
                type="button"
                onClick={openInJira}
                disabled={!issue?.jira_ticket && !jiraPrdfCreateUrl}
                className="border border-[var(--app-border)] px-4 py-3 text-[13px] font-semibold text-[var(--app-text-body)]"
              >
                {issue?.jira_ticket ? "Open in Jira" : "Create PRDF in Jira"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
