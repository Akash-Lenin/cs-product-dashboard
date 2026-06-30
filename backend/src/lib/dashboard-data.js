import { supabase } from "./supabase.js";

function buildIssueAccountsMap(issueAccountsRows) {
  return issueAccountsRows.reduce((acc, row) => {
    const key = row.issue_import_key;
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push({
      accountKey: row.account_key,
      accountName: row.cs_accounts?.account_name || row.account_key,
      isPrimary: row.is_primary_account
    });
    return acc;
  }, new Map());
}

export async function getDashboardIssues(filters = {}) {
  let issuesQuery = supabase
    .from("cs_issues")
    .select("*")
    .order("priority", { ascending: true })
    .order("renewal_date", { ascending: true, nullsFirst: false });

  if (filters.csm) {
    issuesQuery = issuesQuery.eq("csm", filters.csm);
  }
  if (filters.pm) {
    issuesQuery = issuesQuery.eq("pm", filters.pm);
  }
  if (filters.health) {
    issuesQuery = issuesQuery.eq("health", filters.health);
  }
  if (filters.priority) {
    issuesQuery = issuesQuery.eq("priority", filters.priority);
  }
  if (filters.currentStatus) {
    issuesQuery = issuesQuery.eq("current_status", filters.currentStatus);
  }
  if (filters.search) {
    issuesQuery = issuesQuery.or(
      `issue_title.ilike.%${filters.search}%,account_name_raw.ilike.%${filters.search}%,jira_ticket.ilike.%${filters.search}%`
    );
  }

  const [{ data: issues, error: issuesError }, { data: issueAccounts, error: issueAccountsError }] =
    await Promise.all([
      issuesQuery,
      supabase
        .from("cs_issue_accounts")
        .select("issue_import_key,account_key,is_primary_account,cs_accounts(account_name)")
    ]);

  if (issuesError) {
    throw issuesError;
  }
  if (issueAccountsError) {
    throw issueAccountsError;
  }

  const issueAccountsMap = buildIssueAccountsMap(issueAccounts || []);

  return (issues || []).map((issue) => ({
    ...issue,
    accounts: issueAccountsMap.get(issue.issue_import_key) || []
  }));
}

export async function getFilterOptions() {
  const { data, error } = await supabase
    .from("cs_issues")
    .select("csm,pm,health,priority,current_status");

  if (error) {
    throw error;
  }

  const unique = (key) =>
    [...new Set((data || []).map((row) => row[key]).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    );

  return {
    csms: unique("csm"),
    pms: unique("pm"),
    health: unique("health"),
    priorities: unique("priority"),
    currentStatuses: unique("current_status")
  };
}

export async function getDashboardSummary() {
  const { data, error } = await supabase
    .from("cs_issues")
    .select("issue_import_key,health,priority,current_status,acv");

  if (error) {
    throw error;
  }

  const rows = data || [];

  return {
    totalIssues: rows.length,
    highPriority: rows.filter((row) => row.priority === "High").length,
    atRisk: rows.filter((row) => row.health === "Red" || row.health === "Amber").length,
    released: rows.filter((row) => row.current_status === "Released").length,
    totalAcv: rows.reduce((sum, row) => sum + Number(row.acv || 0), 0)
  };
}

