function Badge({ tone, children }) {
  const classes = {
    green: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
    amber: "bg-amber-500/15 text-amber-100 border-amber-400/25",
    red: "bg-rose-500/15 text-rose-100 border-rose-400/25",
    neutral: "bg-white/5 text-stone-200 border-white/10"
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classes[tone] || classes.neutral}`}
    >
      {children}
    </span>
  );
}

function healthTone(health) {
  if (health === "Green") return "green";
  if (health === "Amber") return "amber";
  if (health === "Red") return "red";
  return "neutral";
}

export function IssueTable({ issues, loading }) {
  if (loading) {
    return <div className="p-8 text-stone-300">Loading issues…</div>;
  }

  if (!issues.length) {
    return <div className="p-8 text-stone-400">No issues match the current filters.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-3">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.2em] text-stone-500">
            <th className="px-4 py-2">Issue</th>
            <th className="px-4 py-2">Accounts</th>
            <th className="px-4 py-2">Owners</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Renewal</th>
            <th className="px-4 py-2">Jira</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.issue_import_key} className="rounded-3xl bg-white/[0.03]">
              <td className="rounded-l-3xl px-4 py-4 align-top">
                <div className="font-medium text-stone-50">{issue.issue_title}</div>
                <div className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
                  {issue.business_impact || "No business impact captured yet."}
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  {(issue.accounts || []).map((account) => (
                    <Badge key={`${issue.issue_import_key}-${account.accountKey}`} tone="neutral">
                      {account.accountName}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-4 align-top text-sm text-stone-300">
                <div>{issue.csm || "Unassigned CSM"}</div>
                <div className="mt-2 text-stone-500">{issue.pm || "Unassigned PM"}</div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="flex flex-col gap-2">
                  <Badge tone={healthTone(issue.health)}>{issue.health || "Unknown"}</Badge>
                  <Badge tone="neutral">{issue.priority || "No priority"}</Badge>
                </div>
              </td>
              <td className="px-4 py-4 align-top text-sm text-stone-200">{issue.current_status || "No status"}</td>
              <td className="px-4 py-4 align-top text-sm text-stone-300">{issue.renewal_date || "—"}</td>
              <td className="rounded-r-3xl px-4 py-4 align-top text-sm">
                {issue.jira_ticket ? (
                  <span className="font-medium text-amber-300">{issue.jira_ticket}</span>
                ) : (
                  <span className="text-stone-500">No Jira</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
