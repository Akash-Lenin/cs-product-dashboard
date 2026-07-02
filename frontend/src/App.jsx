import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getAuthConfig, getSupabaseClient } from "./lib/api.js";
import { DeletedIssuesPanel } from "./components/DeletedIssuesPanel.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { FilterBar } from "./components/FilterBar.jsx";
import { IssueDetailDrawer } from "./components/IssueDetailDrawer.jsx";
import { IssueTable } from "./components/IssueTable.jsx";
import { NewIssueModal } from "./components/NewIssueModal.jsx";
import { SummaryCards } from "./components/SummaryCards.jsx";
import { MeetingSpaceView } from "./components/MeetingSpace.jsx";
import { DueThisWeekPanel, LastMeetingCard } from "./components/OverviewPanels.jsx";
import { RoleViewsView } from "./components/RoleViews.jsx";
import {
  ATTENTION_PROFILES,
  buildAttentionSignals,
  isAttentionSnoozed,
  NeedsAttentionView,
  PendingView,
  RecentlyAddedView
} from "./components/WorkspaceViews.jsx";

const emptyFilters = {
  search: "",
  health: "",
  priority: "",
  currentStatus: "",
  account: "",
  csm: ""
};

const statusOrder = ["Open", "In Discovery", "In Development", "Under Review", "Blocked", "Planned", "Released"];

async function fetchJson(url) {
  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function healthRank(health) {
  if (health === "Red") return 0;
  if (health === "Amber") return 1;
  if (health === "Green") return 2;
  return 3;
}

function priorityRank(priority) {
  if (priority === "High") return 0;
  if (priority === "Medium") return 1;
  if (priority === "Low") return 2;
  return 3;
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

function healthColor(health) {
  if (health === "Green") return "var(--health-green)";
  if (health === "Amber") return "var(--health-amber)";
  if (health === "Red") return "var(--health-red)";
  return "var(--health-unknown)";
}

function formatAcvCompact(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `$${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `$${Math.round(number / 1000)}k`;
  return `$${number}`;
}

function describeFetchError(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return "The app could not reach the backend. Make sure the backend server is running on port 4000, then refresh.";
  }

  return error?.message || fallbackMessage;
}

function initialsFromName(name) {
  const words = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "RA";
  return words.map((word) => word[0]).join("").toUpperCase();
}

function daysUntilDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function getSummary(issues, meetings) {
  const active = issues.filter((issue) => issue.current_status !== "Released");
  return {
    totalIssues: issues.length,
    atRisk: issues.filter((issue) => issue.health === "Red" || issue.health === "Amber").length,
    overdueStages: active.filter((issue) => {
      const days = daysUntilDate(issue.stage_due_date);
      return days !== null && days < 0;
    }).length,
    openActionItems: meetings
      .flatMap((meeting) => meeting.action_items || [])
      .filter((item) => item.status !== "done").length,
    totalAcv: issues.reduce((sum, issue) => sum + Number(issue.acv || 0), 0)
  };
}

function matchesSearch(issue, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  const haystack = [
    issue.issue_title,
    issue.jira_ticket,
    issue.issue_import_key,
    issue.csm,
    ...(issue.accounts || []).map((account) => account.accountName)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function ownerColor(name) {
  const map = {
    "Priya Nair": "#5F7FF4",
    "Marcus Reid": "#188874",
    "Elena Fischer": "#B2755A",
    "Dev Sharma": "#C67840",
    "Tom Whitfield": "#B03858"
  };

  return map[name] || "#5F7FF4";
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#13110E" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IssuesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.5" y2="6" />
      <line x1="3" y1="12" x2="3.5" y2="12" />
      <line x1="3" y1="18" x2="3.5" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SearchArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function MeetingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function RolesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 14v5H5V5h5" />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState("overview");
  const [theme, setTheme] = useState(() => window.localStorage.getItem("cs-dashboard-theme") || "light");
  const [allIssues, setAllIssues] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [deletedIssues, setDeletedIssues] = useState([]);
  const [jiraConfig, setJiraConfig] = useState({ jiraBaseUrl: "", jiraPrdfCreateUrl: "", jiraProjectKey: "" });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [operatorName, setOperatorName] = useState(() => window.localStorage.getItem("cs-dashboard-operator-name") || "");
  const [loading, setLoading] = useState(true);
  const [deletedIssuesLoading, setDeletedIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState("");
  const [reviewBinMessage, setReviewBinMessage] = useState("");
  const [savingIssue, setSavingIssue] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState(false);
  const [restoringDeletedId, setRestoringDeletedId] = useState(null);
  const [purgingDeletedId, setPurgingDeletedId] = useState(null);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("");
  const workspaceLoadedRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("cs-dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("cs-dashboard-operator-name", operatorName);
  }, [operatorName]);

  async function loadWorkspaceData() {
    workspaceLoadedRef.current = true;
    setLoading(true);
    setDeletedIssuesLoading(true);
    setIssuesError("");
    try {
      const payload = await fetchJson("/api/issues");
      setAllIssues(payload.issues || []);
    } catch (error) {
      setIssuesError(describeFetchError(error, "Could not load issues."));
    } finally {
      setLoading(false);
    }

    try {
      const payload = await fetchJson("/api/issues/deleted");
      setDeletedIssues(payload.issues || []);
    } catch {
      setDeletedIssues([]);
    } finally {
      setDeletedIssuesLoading(false);
    }

    try {
      const payload = await fetchJson("/api/issues/meta/config");
      setJiraConfig(payload || {});
    } catch {
      setJiraConfig({ jiraBaseUrl: "", jiraPrdfCreateUrl: "", jiraProjectKey: "" });
    }

    try {
      const payload = await fetchJson("/api/meetings");
      setMeetings(payload.meetings || []);
    } catch {
      setMeetings([]);
    }
  }

  async function loadCurrentUser() {
    try {
      const response = await apiFetch("/api/auth/me");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setAuthError(payload?.error?.message || "Sign-in failed. Try again.");
        const client = await getSupabaseClient();
        if (client) {
          await client.auth.signOut();
        }
        setAuthUser(null);
        return;
      }

      setAuthError("");
      setAuthUser(payload.user);
      if (payload.user?.name) {
        setOperatorName(payload.user.name);
      }
      if (!workspaceLoadedRef.current) {
        loadWorkspaceData();
      }
    } catch {
      setAuthError("Could not reach the backend to verify your session.");
    }
  }

  useEffect(() => {
    let unsubscribe = null;

    async function boot() {
      const config = await getAuthConfig();
      setAuthEnabled(Boolean(config.authEnabled));
      setAllowedDomain(config.allowedDomain || "");

      if (!config.authEnabled) {
        setAuthLoading(false);
        loadWorkspaceData();
        return;
      }

      const client = await getSupabaseClient();
      const { data } = await client.auth.getSession();
      if (data?.session) {
        await loadCurrentUser();
      }
      setAuthLoading(false);

      const { data: listener } = client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          loadCurrentUser();
        }
        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          workspaceLoadedRef.current = false;
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    }

    boot();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    setAuthError("");
    try {
      const client = await getSupabaseClient();
      await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
    } catch (error) {
      setAuthError(error?.message || "Could not start Google sign-in.");
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    const client = await getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setAuthUser(null);
    workspaceLoadedRef.current = false;
  }

  useEffect(() => {
    if (!selectedIssue) {
      return;
    }

    const nextIssue = allIssues.find((issue) => issue.issue_import_key === selectedIssue.issue_import_key) || null;
    if (!nextIssue) {
      setSelectedIssue(null);
      return;
    }
    if (nextIssue !== selectedIssue) {
      setSelectedIssue(nextIssue);
    }
  }, [allIssues, selectedIssue]);

  const filterOptions = useMemo(() => {
    const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
    return {
      csms: unique(allIssues.map((issue) => issue.csm)),
      health: unique(allIssues.map((issue) => issue.health)),
      priorities: unique(allIssues.map((issue) => issue.priority)),
      currentStatuses: unique(["Open", ...allIssues.map((issue) => issue.current_status)]),
      accounts: unique(allIssues.flatMap((issue) => (issue.accounts || []).map((account) => account.accountName)))
    };
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (filters.health && issue.health !== filters.health) return false;
      if (filters.priority && issue.priority !== filters.priority) return false;
      if (filters.currentStatus && issue.current_status !== filters.currentStatus) return false;
      if (filters.csm && issue.csm !== filters.csm) return false;
      if (filters.account && !(issue.accounts || []).some((account) => account.accountName === filters.account)) return false;
      if (!matchesSearch(issue, filters.search)) return false;
      return true;
    });
  }, [allIssues, filters]);

  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((left, right) => {
      return (
        healthRank(left.health) - healthRank(right.health) ||
        priorityRank(left.priority) - priorityRank(right.priority) ||
        String(left.issue_title || "").localeCompare(String(right.issue_title || ""))
      );
    });
  }, [filteredIssues]);

  const summary = useMemo(() => getSummary(allIssues, meetings), [allIssues, meetings]);

  const needsAttention = useMemo(() => {
    const storedMode = window.localStorage.getItem("cs-attention-mode") || "operator";
    const profile = ATTENTION_PROFILES[storedMode] || ATTENTION_PROFILES.operator;
    const storedThreshold = Number(window.localStorage.getItem("cs-attention-stale-days"));
    const staleThreshold = [7, 14, 21, 30].includes(storedThreshold) ? storedThreshold : 14;

    return allIssues
      .filter((issue) => !isAttentionSnoozed(issue))
      .map((issue) => ({ issue, ...buildAttentionSignals(issue, profile.weights, staleThreshold) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || Number(right.issue.acv || 0) - Number(left.issue.acv || 0))
      .slice(0, 6);
  }, [allIssues]);

  const latestMeeting = meetings[0] || null;

  const statusDistribution = useMemo(() => {
    const counts = statusOrder.map((status) => ({
      label: status,
      count: allIssues.filter((issue) => issue.current_status === status).length,
      color: statusColor(status)
    })).filter((entry) => entry.count > 0);

    const maxCount = Math.max(...counts.map((entry) => entry.count), 1);
    return counts.map((entry) => ({ ...entry, percent: (entry.count / maxCount) * 100 }));
  }, [allIssues]);


  async function handleIssueSave(issueImportKey, updates) {
    setSavingIssue(true);
    try {
      const response = await apiFetch(`/api/issues/${issueImportKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, actor_name: operatorName })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || `Save failed: ${response.status}`);
      }

      const payload = await response.json();
      const updatedIssue = payload.issue;

      setAllIssues((current) =>
        current.map((issue) => (issue.issue_import_key === updatedIssue.issue_import_key ? updatedIssue : issue))
      );
      setSelectedIssue(updatedIssue);
    } finally {
      setSavingIssue(false);
    }
  }

  async function handleQuickUpdate(issueImportKey, updates) {
    const response = await apiFetch(`/api/issues/${issueImportKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, actor_name: operatorName })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || `Quick update failed: ${response.status}`);
    }

    const payload = await response.json();
    const updatedIssue = payload.issue;

    setAllIssues((current) =>
      current.map((issue) => (issue.issue_import_key === updatedIssue.issue_import_key ? updatedIssue : issue))
    );
  }

  async function handleSendToJira(issueImportKey) {
    const response = await apiFetch(`/api/issues/${issueImportKey}/create-prdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_name: operatorName })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || `PRDF creation failed: ${response.status}`);
    }

    const payload = await response.json();
    const updatedIssue = payload.issue;

    setAllIssues((current) =>
      current.map((issue) => (issue.issue_import_key === updatedIssue.issue_import_key ? updatedIssue : issue))
    );
  }

  async function handleIssueCreate(payload) {
    const response = await apiFetch(payload.create_prdf_in_jira ? "/api/issues" : "/api/issues/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, actor_name: operatorName })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message || `Create failed: ${response.status}`);
    }

    const body = await response.json();
    const issue = body.issue;

    setAllIssues((current) => [issue, ...current]);
    setView("issues");
    setSelectedIssue(issue);
    setCreatingIssue(false);
  }

  async function handleIssueDelete(issueImportKey, payload) {
    setDeletingIssue(true);
    setReviewBinMessage("");
    try {
      const response = await apiFetch(`/api/issues/${issueImportKey}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, actor_name: operatorName })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `Delete failed: ${response.status}`);
      }

      const body = await response.json();
      const deletedIssue = body.deletedIssue;

      setAllIssues((current) => current.filter((issue) => issue.issue_import_key !== issueImportKey));
      setDeletedIssues((current) => [deletedIssue, ...current]);
      setReviewBinMessage("Issue moved to the review bin.");
      setSelectedIssue(null);
    } finally {
      setDeletingIssue(false);
    }
  }

  async function handleDeletedIssueRestore(deletedId) {
    const confirmed = window.confirm("Restore this issue back into the active tracker?");
    if (!confirmed) {
      return;
    }

    setRestoringDeletedId(deletedId);
    setReviewBinMessage("");
    try {
      const response = await apiFetch(`/api/issues/deleted/${deletedId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_name: operatorName })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `Restore failed: ${response.status}`);
      }

      const body = await response.json();
      const restoredIssue = body.issue;

      setDeletedIssues((current) => current.filter((issue) => issue.deleted_id !== deletedId));
      setAllIssues((current) => [restoredIssue, ...current]);
      setReviewBinMessage("Issue restored back into the active tracker.");
      setView("issues");
      setSelectedIssue(restoredIssue);
    } catch (error) {
      setReviewBinMessage(error?.message || "Restore failed.");
    } finally {
      setRestoringDeletedId(null);
    }
  }

  async function handleDeletedIssuePermanentDelete(deletedId) {
    const confirmed = window.confirm("Delete this issue permanently from the review bin?");
    if (!confirmed) {
      return;
    }

    setPurgingDeletedId(deletedId);
    setReviewBinMessage("");
    try {
      const response = await apiFetch(`/api/issues/deleted/${deletedId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `Permanent delete failed: ${response.status}`);
      }

      setDeletedIssues((current) => current.filter((issue) => issue.deleted_id !== deletedId));
      setReviewBinMessage("Issue removed permanently from the review bin.");
    } catch (error) {
      setReviewBinMessage(error?.message || "Permanent delete failed.");
    } finally {
      setPurgingDeletedId(null);
    }
  }

  function openPrdfCreateLink() {
    if (!jiraConfig?.jiraPrdfCreateUrl) {
      return;
    }
    window.open(jiraConfig.jiraPrdfCreateUrl, "_blank", "noopener,noreferrer");
  }

  const pageMeta = {
    overview: {
      title: "Overview",
      subtitle: "Customer-reported product issues across your book of business"
    },
    issues: {
      title: "Issues",
      subtitle: "Track, filter and triage every open request"
    },
    pending: {
      title: "Pending",
      subtitle: "Assigned work ranked by urgency, due dates, blockers, and follow-through"
    },
    meetings: {
      title: "Meeting space",
      subtitle: "Log meetings, capture notes and decisions, and track action items for the weekly sync"
    },
    attention: {
      title: "Needs attention",
      subtitle: "Risk-driven queue for items that need a faster review pass"
    },
    recent: {
      title: "Recently added",
      subtitle: "Fresh intake across tracker items, PRDF links, and newly surfaced customer asks"
    },
    roles: {
      title: "Role views",
      subtitle: "The tracker cut for how each role works: a CSM's book, a PM's pipeline, or the leadership review"
    },
    trash: {
      title: "Review bin",
      subtitle: "Hold deleted tracker items here until someone restores them or removes them permanently"
    }
  };
  const currentMeta = pageMeta[view] || pageMeta.issues;
  const currentUserName = authUser?.name || operatorName || "Riya Ahuja";
  const canEdit = !authEnabled || authUser?.role === "editor";

  if (authLoading) {
    return (
      <main className="cs-app flex min-h-screen items-center justify-center">
        <div className="text-sm" style={{ color: "var(--app-text-muted)" }}>Loading workspace…</div>
      </main>
    );
  }

  if (authEnabled && !authUser) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        signingIn={signingIn}
        error={authError}
        allowedDomain={allowedDomain}
      />
    );
  }

  return (
    <main className="cs-app">
      <div className="cs-shell">
        <aside className="cs-sidebar">
          <div className="cs-brand">
            <div className="cs-brand-mark">
              <BrandIcon />
            </div>
            <div>
              <div className="cs-brand-title">Everstage</div>
              <div className="cs-brand-subtitle">CS x Product</div>
            </div>
          </div>

          <div className="cs-nav-label">Workspace</div>

          <nav className="cs-nav">
            {[
              { key: "overview", label: "Overview", icon: <OverviewIcon />, count: null },
              { key: "issues", label: "Issues", icon: <IssuesIcon />, count: allIssues.length },
              { key: "pending", label: "Pending", icon: <QueueIcon />, count: allIssues.filter((issue) => issue.current_status !== "Released").length },
              { key: "attention", label: "Needs attention", icon: <AlertIcon />, count: needsAttention.length },
              { key: "meetings", label: "Meeting space", icon: <MeetingIcon />, count: meetings.length },
              { key: "recent", label: "Recently added", icon: <SparkIcon />, count: null },
              { key: "roles", label: "Role views", icon: <RolesIcon />, count: null },
              { key: "trash", label: "Review bin", icon: <TrashIcon />, count: deletedIssues.length }
            ].map((item) => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`cs-nav-item ${active ? "is-active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count !== null ? <span className="cs-nav-count">{item.count}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="cs-user">
            <div className="cs-user-divider" />
            <div className="cs-user-chip">
              <div
                className="cs-avatar"
                style={{ backgroundColor: ownerColor(currentUserName) }}
              >
                {initialsFromName(currentUserName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{currentUserName}</div>
                <div className="text-[11px]" style={{ color: "var(--app-sidebar-muted)" }}>
                  {authEnabled ? (authUser?.role === "editor" ? "Editor" : "Reviewer · read-only") : "RevOps Lead"}
                </div>
              </div>
              {authEnabled ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="shrink-0 rounded-md border px-2 py-1 text-[10.5px] font-semibold"
                  style={{ borderColor: "rgba(250,250,247,0.25)", color: "var(--app-sidebar-muted)" }}
                  title="Sign out"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="cs-main">
          <header className="cs-topbar">
            <div className="min-w-0">
              <h1 className="cs-title">{currentMeta.title}</h1>
              <p className="cs-subtitle">{currentMeta.subtitle}</p>
            </div>

            <div className="cs-actions">
              {jiraConfig?.jiraPrdfCreateUrl ? (
                <button
                  type="button"
                  className="border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[13px] font-semibold text-[var(--app-text-body)]"
                  onClick={openPrdfCreateLink}
                >
                  <span className="inline-flex items-center gap-2">
                    <ExternalLinkIcon />
                    Create PRDF in Jira
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                className="cs-icon-button"
                title="Toggle theme"
              >
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className="cs-primary-button"
                  onClick={() => setCreatingIssue(true)}
                >
                  <PlusIcon />
                  New issue
                </button>
              ) : null}
            </div>
          </header>

          <div className="cs-content">
            {issuesError ? (
              <div className="cs-panel px-5 py-4 text-sm text-[#842A42]">
                {issuesError}
              </div>
            ) : null}

            {!issuesError && view === "overview" ? (
              <div className="cs-overview">
                <SummaryCards summary={summary} />

                <div className="cs-overview-grid">
                  <section className="cs-panel">
                    <div className="cs-panel-header">
                      <div>
                        <h2 className="cs-panel-title">Needs attention</h2>
                        <p className="cs-panel-subtitle">Weighted by risk, urgency, and follow-through; snoozed items excluded</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setView("attention")}
                        className="cs-link-button"
                      >
                        View all
                        <SearchArrow />
                      </button>
                    </div>
                    <div>
                      {needsAttention.map(({ issue, signals }) => (
                        <button
                          key={issue.issue_import_key}
                          type="button"
                          onClick={() => {
                            setSelectedIssue(issue);
                          }}
                          className="cs-attention-row"
                        >
                          <span className="cs-dot" style={{ backgroundColor: healthColor(issue.health) }} />
                          <div className="min-w-0 flex-1">
                            <div className="cs-row-title">{issue.issue_title}</div>
                            <div className="cs-row-subtitle">
                              {[
                                (issue.accounts || []).map((account) => account.accountName).join(", "),
                                signals.slice(0, 2).map((signal) => signal.label).join(", ")
                              ].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <span
                            className="cs-priority-pill"
                            style={issue.priority === "High" ? { background: "#F8DAE2", color: "#842A42" } : { background: "#FEEADC", color: "#8E5E48" }}
                          >
                            {issue.priority || "Low"}
                          </span>
                          <span className="cs-acv">{formatAcvCompact(issue.acv)}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="flex min-w-0 flex-col gap-6">
                    <section className="cs-panel cs-status-card">
                      <h2 className="cs-panel-title">By status</h2>
                      <p className="cs-panel-subtitle">Where issues sit in the pipeline</p>
                      <div className="cs-status-list">
                        {statusDistribution.map((entry) => (
                          <div key={entry.label}>
                            <div className="cs-status-label">
                              <span className="inline-flex items-center gap-2">
                                <span className="cs-dot" style={{ backgroundColor: entry.color }} />
                                {entry.label}
                              </span>
                              <span>{entry.count}</span>
                            </div>
                            <div className="cs-status-track">
                              <div className="cs-status-fill" style={{ width: `${entry.percent}%`, backgroundColor: entry.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <DueThisWeekPanel
                      issues={allIssues}
                      onSelectIssue={setSelectedIssue}
                      onOpenPending={() => setView("pending")}
                    />
                  </div>
                </div>

                <LastMeetingCard meeting={latestMeeting} onOpenMeetings={() => setView("meetings")} />
              </div>
            ) : null}

            {!issuesError && view === "issues" ? (
              <div className="cs-issues-view">
                <FilterBar
                  filters={filters}
                  options={filterOptions}
                  onChange={setFilters}
                  onReset={() => setFilters(emptyFilters)}
                  resultCount={sortedIssues.length}
                  totalCount={allIssues.length}
                />

                <section className="cs-table-card">
                  <IssueTable issues={sortedIssues} loading={loading} onSelectIssue={setSelectedIssue} />
                </section>
              </div>
            ) : null}

            {!issuesError && view === "pending" ? (
              <PendingView issues={allIssues} onSelectIssue={setSelectedIssue} operatorName={operatorName} />
            ) : null}

            {!issuesError && view === "attention" ? (
              <NeedsAttentionView
                issues={allIssues}
                onSelectIssue={setSelectedIssue}
                onQuickUpdate={handleQuickUpdate}
                operatorName={operatorName}
              />
            ) : null}

            {!issuesError && view === "meetings" ? (
              <MeetingSpaceView issues={allIssues} onSelectIssue={setSelectedIssue} operatorName={operatorName} />
            ) : null}

            {!issuesError && view === "recent" ? (
              <RecentlyAddedView
                issues={allIssues}
                onSelectIssue={setSelectedIssue}
                onQuickUpdate={handleQuickUpdate}
                onSendToJira={handleSendToJira}
                jiraConfig={jiraConfig}
              />
            ) : null}

            {!issuesError && view === "roles" ? (
              <RoleViewsView issues={allIssues} onSelectIssue={setSelectedIssue} operatorName={operatorName} />
            ) : null}

            {!issuesError && view === "trash" ? (
              <DeletedIssuesPanel
                issues={deletedIssues}
                loading={deletedIssuesLoading}
                restoringId={restoringDeletedId}
                purgingId={purgingDeletedId}
                message={reviewBinMessage}
                onRestore={handleDeletedIssueRestore}
                onDeleteForever={handleDeletedIssuePermanentDelete}
              />
            ) : null}
          </div>
        </div>
      </div>

      <IssueDetailDrawer
        issue={selectedIssue}
        filterOptions={filterOptions}
        operatorName={operatorName}
        saving={savingIssue}
        deleting={deletingIssue}
        jiraBaseUrl={jiraConfig.jiraBaseUrl}
        jiraPrdfCreateUrl={jiraConfig.jiraPrdfCreateUrl}
        onClose={() => setSelectedIssue(null)}
        onSave={handleIssueSave}
        onDelete={handleIssueDelete}
      />

      <NewIssueModal
        open={creatingIssue}
        onClose={() => setCreatingIssue(false)}
        onCreate={handleIssueCreate}
      />
    </main>
  );
}
