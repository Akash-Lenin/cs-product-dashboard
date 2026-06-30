function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-stone-900 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-400"
      >
        <option value="">All</option>
        {(options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ filters, options, onChange, onReset }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <label className="flex-1">
          <span className="mb-2 block text-sm text-stone-400">Search</span>
          <input
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search by issue, account, or Jira key"
            className="w-full rounded-2xl border border-white/10 bg-stone-900 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-400"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-stone-200 transition hover:border-amber-400 hover:text-amber-200"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SelectField label="CSM" value={filters.csm} onChange={(value) => update("csm", value)} options={options?.csms} />
        <SelectField label="PM" value={filters.pm} onChange={(value) => update("pm", value)} options={options?.pms} />
        <SelectField label="Health" value={filters.health} onChange={(value) => update("health", value)} options={options?.health} />
        <SelectField label="Priority" value={filters.priority} onChange={(value) => update("priority", value)} options={options?.priorities} />
        <SelectField
          label="Current Status"
          value={filters.currentStatus}
          onChange={(value) => update("currentStatus", value)}
          options={options?.currentStatuses}
        />
      </div>
    </div>
  );
}

