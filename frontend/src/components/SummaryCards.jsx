function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Total Issues",
      value: summary?.totalIssues ?? "..."
    },
    {
      label: "High Priority",
      value: summary?.highPriority ?? "..."
    },
    {
      label: "At Risk",
      value: summary?.atRisk ?? "..."
    },
    {
      label: "Released",
      value: summary?.released ?? "..."
    },
    {
      label: "Tracked ACV",
      value: summary ? formatCurrency(summary.totalAcv) : "..."
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur"
        >
          <p className="text-sm text-stone-400">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold text-stone-50">{card.value}</p>
        </article>
      ))}
    </section>
  );
}

