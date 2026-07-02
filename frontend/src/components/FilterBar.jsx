function SelectField({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[132px] appearance-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 pr-10 text-[13.5px] font-medium text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
      >
        <option value="">{placeholder}</option>
        {(options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--app-text-muted)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

export function FilterBar({ filters, options, onChange, onReset, resultCount = 0, totalCount = 0 }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[260px] flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search issues, accounts, Jira..."
          className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]"
        />
      </div>

      <SelectField value={filters.health} onChange={(value) => update("health", value)} options={options?.health} placeholder="All health" />
      <SelectField value={filters.priority} onChange={(value) => update("priority", value)} options={options?.priorities} placeholder="All priority" />
      <SelectField
        value={filters.currentStatus}
        onChange={(value) => update("currentStatus", value)}
        options={options?.currentStatuses}
        placeholder="All status"
      />
      <SelectField value={filters.account} onChange={(value) => update("account", value)} options={options?.accounts} placeholder="All accounts" />
      <SelectField value={filters.csm} onChange={(value) => update("csm", value)} options={options?.csms} placeholder="All CSMs" />

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-[var(--app-border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--app-text-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
        >
          Clear
        </button>
      ) : null}

      <div className="ml-auto text-[13px] text-[var(--app-text-muted)]">
        {hasActiveFilters ? `${resultCount} of ${totalCount}` : totalCount} issues
      </div>
    </div>
  );
}
