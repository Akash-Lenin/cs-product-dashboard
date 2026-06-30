import { useEffect, useState } from "react";
import { FilterBar } from "./components/FilterBar.jsx";
import { IssueTable } from "./components/IssueTable.jsx";
import { SummaryCards } from "./components/SummaryCards.jsx";

const emptyFilters = {
  csm: "",
  pm: "",
  health: "",
  priority: "",
  currentStatus: "",
  search: ""
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function buildIssuesUrl(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `/api/issues?${query}` : "/api/issues";
}

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeta() {
      try {
        const [summaryPayload, filterPayload] = await Promise.all([
          fetchJson("/api/issues/meta/summary"),
          fetchJson("/api/issues/meta/filters")
        ]);
        setSummary(summaryPayload);
        setFilterOptions(filterPayload);
      } catch (metaError) {
        setError(metaError.message);
      }
    }

    loadMeta();
  }, []);

  useEffect(() => {
    async function loadIssues() {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchJson(buildIssuesUrl(filters));
        setIssues(payload.issues || []);
      } catch (issuesError) {
        setError(issuesError.message);
      } finally {
        setLoading(false);
      }
    }

    loadIssues();
  }, [filters]);

  return (
    <main className="min-h-screen px-4 py-8 text-ink md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">CS x Product</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-50 md:text-5xl">
                Customer issues dashboard
              </h1>
              <p className="mt-4 text-base leading-7 text-stone-300">
                Railway-ready app scaffold using your Supabase import. This view is built around
                issue tracking first, with accounts and linked owners layered in cleanly.
              </p>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <div className="font-medium">Stack</div>
              <div className="mt-1 text-amber-50/80">React + Tailwind + Express + Supabase + Railway</div>
            </div>
          </div>
        </section>

        <SummaryCards summary={summary} />

        <section className="rounded-[2rem] border border-white/10 bg-stone-900/70 p-5 shadow-soft backdrop-blur">
          <FilterBar
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            onReset={() => setFilters(emptyFilters)}
          />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-stone-950/70 p-5 shadow-soft backdrop-blur">
          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
              {error}
            </div>
          ) : (
            <IssueTable issues={issues} loading={loading} />
          )}
        </section>
      </div>
    </main>
  );
}

