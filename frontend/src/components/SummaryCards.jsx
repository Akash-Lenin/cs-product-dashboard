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
  high: "#DC466E",
  risk: "#F89650",
  released: "#1EAA91",
  acv: "#5F7FF4"
};

export function SummaryCards({ summary }) {
  const cards = [
    { key: "total", label: "Total issues", value: summary?.totalIssues ?? "14" },
    { key: "high", label: "High priority", value: summary?.highPriority ?? "6" },
    { key: "risk", label: "At risk", value: summary?.atRisk ?? "9" },
    { key: "released", label: "Released", value: summary?.released ?? "3" },
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
