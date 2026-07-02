function formatCurrencyCompact(value) {
  if (!value) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value));
}

const dots = {
  total: "#797265",
  risk: "#F89650",
  overdue: "#DC466E",
  actions: "#1EAA91",
  acv: "#5F7FF4"
};

export function SummaryCards({ summary }) {
  const cards = [
    { key: "total", label: "Total issues", value: summary?.totalIssues ?? "0" },
    { key: "risk", label: "At risk", value: summary?.atRisk ?? "0" },
    { key: "overdue", label: "Overdue stages", value: summary?.overdueStages ?? "0" },
    { key: "actions", label: "Open action items", value: summary?.openActionItems ?? "0" },
    { key: "acv", label: "Tracked ACV", value: summary ? formatCurrencyCompact(summary.totalAcv) : "$0" }
  ];

  return (
    <section className="cs-metric-grid">
      {cards.map((card) => (
        <article key={card.key} className="cs-metric-card">
          <div className="cs-metric-label">
            <span className="cs-dot" style={{ backgroundColor: dots[card.key] }} />
            <span>{card.label}</span>
          </div>
          <div className="cs-metric-value">{card.value}</div>
        </article>
      ))}
    </section>
  );
}
