export function UserIdentityBar({ operatorName, onChange, compact = false }) {
  if (compact) {
    return (
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
        <div className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Workspace identity</div>
        <div className="mt-2 text-sm leading-6 text-stone-400">
          This name is attached to issue history and field changes from this browser.
        </div>
        <label className="mt-4 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Display name</span>
          <input
            value={operatorName}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Your name"
            className="rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-400"
          />
        </label>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-stone-900/70 p-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Operator identity</div>
          <div className="mt-2 text-sm text-stone-400">
            This name will be used for issue history entries and change attribution from this browser.
          </div>
        </div>
        <label className="flex min-w-[280px] flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Display name</span>
          <input
            value={operatorName}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Your name"
            className="rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-400"
          />
        </label>
      </div>
    </section>
  );
}
