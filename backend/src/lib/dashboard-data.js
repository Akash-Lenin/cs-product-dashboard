import { supabase } from "./supabase.js";
import { createPrdfJiraIssue } from "./jira.js";

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

function buildIssueHistoryMap(updateRows) {
  return updateRows.reduce((acc, row) => {
    const existing = acc.get(row.issue_import_key);
    const createdAt = row.created_at || null;

    if (!existing) {
      acc.set(row.issue_import_key, {
        historyCount: 1,
        lastHistoryAt: createdAt,
        lastHistoryType: row.entry_type || null
      });
      return acc;
    }

    existing.historyCount += 1;
    if (!existing.lastHistoryAt || String(createdAt) > String(existing.lastHistoryAt)) {
      existing.lastHistoryAt = createdAt;
      existing.lastHistoryType = row.entry_type || null;
    }

    return acc;
  }, new Map());
}

function isMissingRelationError(error) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function isNotFoundError(error) {
  return error?.code === "PGRST116";
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIssueUpdateValue(key, value) {
  if (value === undefined) {
    return undefined;
  }

  if (key === "resolution_eta" || key === "stage_due_date" || key === "attention_snoozed_until") {
    return value ? value : null;
  }

  return typeof value === "string" ? value.trim() : value;
}

function sanitizeIssueRowForStorage(issue = {}) {
  const { accounts, historyCount, lastHistoryAt, lastHistoryType, ...issueRow } = issue;
  return issueRow;
}

async function getNextSourceRowNumber() {
  const { data, error } = await supabase
    .from("cs_issues")
    .select("source_row_number")
    .order("source_row_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.source_row_number || 0) + 1;
}

async function getIssueWithAccounts(issueImportKey) {
  const [
    { data: issue, error: issueError },
    { data: issueAccounts, error: issueAccountsError }
  ] = await Promise.all([
    supabase.from("cs_issues").select("*").eq("issue_import_key", issueImportKey).single(),
    supabase
      .from("cs_issue_accounts")
      .select("issue_import_key,account_key,is_primary_account,cs_accounts(account_name)")
      .eq("issue_import_key", issueImportKey)
  ]);

  if (issueError) {
    throw issueError;
  }
  if (issueAccountsError) {
    throw issueAccountsError;
  }

  const issueAccountsMap = buildIssueAccountsMap(issueAccounts || []);

  return {
    ...issue,
    accounts: issueAccountsMap.get(issueImportKey) || []
  };
}

async function getIssueSnapshot(issueImportKey) {
  const issue = await getIssueWithAccounts(issueImportKey);

  const { data: issueUpdates, error: issueUpdatesError } = await supabase
    .from("cs_issue_updates")
    .select("entry_type,body,author_name,source,created_at")
    .eq("issue_import_key", issueImportKey)
    .order("created_at", { ascending: true });

  if (issueUpdatesError && !isMissingRelationError(issueUpdatesError)) {
    throw issueUpdatesError;
  }

  return {
    issue: sanitizeIssueRowForStorage(issue),
    accounts: issue.accounts || [],
    history: issueUpdatesError ? [] : issueUpdates || []
  };
}

function formatDeletedIssue(row) {
  const issueSnapshot = row.issue_snapshot || {};
  const accountsSnapshot = Array.isArray(row.accounts_snapshot) ? row.accounts_snapshot : [];
  const historySnapshot = Array.isArray(row.history_snapshot) ? row.history_snapshot : [];

  return {
    deleted_id: row.id,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by || "",
    delete_reason: row.delete_reason || "",
    issue_import_key: row.issue_import_key,
    logical_issue_key: row.logical_issue_key || issueSnapshot.logical_issue_key || "",
    issue_title: row.issue_title || issueSnapshot.issue_title || "",
    account_name_raw: row.account_name_raw || issueSnapshot.account_name_raw || "",
    jira_ticket: row.jira_ticket || issueSnapshot.jira_ticket || "",
    health: issueSnapshot.health || "",
    priority: issueSnapshot.priority || "",
    current_status: issueSnapshot.current_status || "",
    acv: issueSnapshot.acv || 0,
    csm: issueSnapshot.csm || "",
    pm: issueSnapshot.pm || "",
    assignee_name: issueSnapshot.assignee_name || "",
    accounts: accountsSnapshot,
    historyCount: historySnapshot.length
  };
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
  if (filters.assignee) {
    issuesQuery = issuesQuery.eq("assignee_name", filters.assignee);
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
  let issueHistoryMap = new Map();

  const { data: issueUpdates, error: issueUpdatesError } = await supabase
    .from("cs_issue_updates")
    .select("issue_import_key,entry_type,created_at");

  if (issueUpdatesError && !isMissingRelationError(issueUpdatesError)) {
    throw issueUpdatesError;
  }

  if (!issueUpdatesError) {
    issueHistoryMap = buildIssueHistoryMap(issueUpdates || []);
  }

  return (issues || []).map((issue) => ({
    ...issue,
    accounts: issueAccountsMap.get(issue.issue_import_key) || [],
    historyCount: issueHistoryMap.get(issue.issue_import_key)?.historyCount || 0,
    lastHistoryAt: issueHistoryMap.get(issue.issue_import_key)?.lastHistoryAt || null,
    lastHistoryType: issueHistoryMap.get(issue.issue_import_key)?.lastHistoryType || null
  }));
}

export async function getFilterOptions() {
  const { data, error } = await supabase
    .from("cs_issues")
    .select("csm,pm,assignee_name,health,priority,current_status");

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
    assignees: unique("assignee_name"),
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

export async function getDeletedIssues() {
  const { data, error } = await supabase
    .from("cs_deleted_issues")
    .select("*")
    .order("deleted_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      const missingTableError = new Error(
        "Deleted issues table is not created yet. Run the Supabase migration for cs_deleted_issues first."
      );
      missingTableError.status = 503;
      throw missingTableError;
    }
    throw error;
  }

  return (data || []).map(formatDeletedIssue);
}

export async function createDashboardIssue(payload = {}) {
  const issueTitle = String(payload.issue_title || "").trim();
  const accountName = String(payload.account_name || "").trim();
  const actorName = String(payload.actor_name || "").trim();
  const createPrdfInJira =
    payload.create_prdf_in_jira === true ||
    payload.create_prdf_in_jira === "true" ||
    payload.create_prdf_in_jira === 1 ||
    payload.create_prdf_in_jira === "1";

  if (!issueTitle) {
    const error = new Error("Issue title is required");
    error.status = 400;
    throw error;
  }

  if (!accountName) {
    const error = new Error("Account name is required");
    error.status = 400;
    throw error;
  }

  const accountKey = slugify(accountName);
  const timestamp = Date.now();
  const issueImportKey = `app_issue_${timestamp}`;
  const sourceRowNumber = await getNextSourceRowNumber();
  let jiraTicket = String(payload.jira_ticket || "").trim();
  const devJiraTicket = String(payload.dev_jira_ticket || "").trim();

  if (!jiraTicket && createPrdfInJira) {
    const jiraIssue = await createPrdfJiraIssue({
      ...payload,
      issue_title: issueTitle,
      account_name: accountName
    });
    jiraTicket = jiraIssue.key;
  }

  const { error: accountError } = await supabase
    .from("cs_accounts")
    .upsert(
      {
        account_key: accountKey,
        account_name: accountName,
        account_name_normalized: accountName.toLowerCase()
      },
      { onConflict: "account_key" }
    );

  if (accountError) {
    throw accountError;
  }

  const issuePayload = {
    issue_import_key: issueImportKey,
    logical_issue_key: jiraTicket || devJiraTicket || issueImportKey,
    source_sheet_name: "CS Dashboard",
    source_row_number: sourceRowNumber,
    primary_account_key: accountKey,
    account_name_raw: accountName,
    account_count: 1,
    issue_title: issueTitle,
    csm: String(payload.csm || "").trim() || null,
    pm: String(payload.pm || "").trim() || null,
    assignee_name: String(payload.assignee_name || "").trim() || null,
    health: String(payload.health || "Amber").trim(),
    priority: String(payload.priority || "Medium").trim(),
    current_status: String(payload.current_status || "Open").trim(),
    business_impact: String(payload.business_impact || "").trim() || null,
    jira_ticket: jiraTicket || null,
    dev_jira_ticket: devJiraTicket || null,
    support_ticket: String(payload.support_ticket || "").trim() || null,
    next_steps: String(payload.next_steps || "").trim() || null,
    stage_due_date: payload.stage_due_date || null,
    resolution_eta: payload.resolution_eta || null,
    customers_affected: String(payload.customers_affected || "").trim() || null,
    meeting_notes: String(payload.meeting_notes || "").trim() || null,
    product_feedback: String(payload.product_feedback || "").trim() || null
  };

  const { error: issueError } = await supabase.from("cs_issues").insert(issuePayload);

  if (issueError) {
    throw issueError;
  }

  const { error: issueAccountError } = await supabase.from("cs_issue_accounts").insert({
    issue_import_key: issueImportKey,
    account_key: accountKey,
    is_primary_account: true
  });

  if (issueAccountError) {
    throw issueAccountError;
  }

  try {
    await createIssueUpdate(issueImportKey, {
      author_name: actorName || "CS Dashboard",
      entry_type: "state_change",
      body: `Created issue for ${accountName}${jiraTicket ? ` and linked ${jiraTicket}` : " without a PRDF ticket yet"}`
    });
  } catch (historyError) {
    if (!isMissingRelationError(historyError)) {
      throw historyError;
    }
  }

  return getIssueWithAccounts(issueImportKey);
}

export async function createTrackerIssue(payload = {}) {
  return createDashboardIssue({
    ...payload,
    create_prdf_in_jira: false
  });
}

export async function deleteDashboardIssue(issueImportKey, payload = {}) {
  const actorName = String(payload.actor_name || "").trim();
  const deleteReason = String(payload.delete_reason || "").trim();

  let snapshot;

  try {
    snapshot = await getIssueSnapshot(issueImportKey);
  } catch (error) {
    if (isNotFoundError(error)) {
      const notFoundError = new Error("Issue not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    throw error;
  }

  const archivePayload = {
    issue_import_key: issueImportKey,
    logical_issue_key: snapshot.issue.logical_issue_key || null,
    issue_title: snapshot.issue.issue_title || null,
    account_name_raw: snapshot.issue.account_name_raw || null,
    jira_ticket: snapshot.issue.jira_ticket || null,
    deleted_by: actorName || null,
    delete_reason: deleteReason || null,
    issue_snapshot: snapshot.issue,
    accounts_snapshot: snapshot.accounts,
    history_snapshot: snapshot.history
  };

  const { data: archivedIssueRow, error: archiveError } = await supabase
    .from("cs_deleted_issues")
    .upsert(archivePayload, { onConflict: "issue_import_key" })
    .select("*")
    .single();

  if (archiveError) {
    if (isMissingRelationError(archiveError)) {
      const missingTableError = new Error(
        "Deleted issues table is not created yet. Run the Supabase migration for cs_deleted_issues first."
      );
      missingTableError.status = 503;
      throw missingTableError;
    }
    throw archiveError;
  }

  const { error: deleteAccountsError } = await supabase
    .from("cs_issue_accounts")
    .delete()
    .eq("issue_import_key", issueImportKey);

  if (deleteAccountsError) {
    throw deleteAccountsError;
  }

  const { error: deleteIssueError } = await supabase
    .from("cs_issues")
    .delete()
    .eq("issue_import_key", issueImportKey);

  if (deleteIssueError) {
    throw deleteIssueError;
  }

  return formatDeletedIssue(archivedIssueRow);
}

export async function restoreDeletedIssue(deletedId, payload = {}) {
  const actorName = String(payload.actor_name || "").trim();

  const { data: deletedIssue, error: deletedIssueError } = await supabase
    .from("cs_deleted_issues")
    .select("*")
    .eq("id", deletedId)
    .single();

  if (deletedIssueError) {
    if (isNotFoundError(deletedIssueError)) {
      const notFoundError = new Error("Deleted issue not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    if (isMissingRelationError(deletedIssueError)) {
      const missingTableError = new Error(
        "Deleted issues table is not created yet. Run the Supabase migration for cs_deleted_issues first."
      );
      missingTableError.status = 503;
      throw missingTableError;
    }
    throw deletedIssueError;
  }

  const { data: existingIssue, error: existingIssueError } = await supabase
    .from("cs_issues")
    .select("issue_import_key")
    .eq("issue_import_key", deletedIssue.issue_import_key)
    .maybeSingle();

  if (existingIssueError) {
    throw existingIssueError;
  }

  if (existingIssue) {
    const conflictError = new Error("An active issue with this key already exists.");
    conflictError.status = 409;
    throw conflictError;
  }

  const issueSnapshot = sanitizeIssueRowForStorage(deletedIssue.issue_snapshot || {});
  const accountsSnapshot = Array.isArray(deletedIssue.accounts_snapshot) ? deletedIssue.accounts_snapshot : [];
  const historySnapshot = Array.isArray(deletedIssue.history_snapshot) ? deletedIssue.history_snapshot : [];

  const accountUpserts = accountsSnapshot
    .filter((account) => account?.accountKey)
    .map((account) => ({
      account_key: account.accountKey,
      account_name: account.accountName || account.accountKey,
      account_name_normalized: String(account.accountName || account.accountKey).toLowerCase()
    }));

  if (accountUpserts.length) {
    const { error: accountError } = await supabase
      .from("cs_accounts")
      .upsert(accountUpserts, { onConflict: "account_key" });

    if (accountError) {
      throw accountError;
    }
  }

  const { error: issueInsertError } = await supabase.from("cs_issues").insert(issueSnapshot);

  if (issueInsertError) {
    throw issueInsertError;
  }

  if (accountsSnapshot.length) {
    const { error: issueAccountsError } = await supabase.from("cs_issue_accounts").insert(
      accountsSnapshot.map((account) => ({
        issue_import_key: deletedIssue.issue_import_key,
        account_key: account.accountKey,
        is_primary_account: Boolean(account.isPrimary)
      }))
    );

    if (issueAccountsError) {
      throw issueAccountsError;
    }
  }

  if (historySnapshot.length) {
    const { error: historyInsertError } = await supabase.from("cs_issue_updates").insert(
      historySnapshot.map((entry) => ({
        issue_import_key: deletedIssue.issue_import_key,
        entry_type: entry.entry_type || "state_change",
        body: entry.body || "",
        author_name: entry.author_name || null,
        source: entry.source || "app",
        created_at: entry.created_at || new Date().toISOString()
      }))
    );

    if (historyInsertError && !isMissingRelationError(historyInsertError)) {
      throw historyInsertError;
    }
  }

  try {
    await createIssueUpdate(deletedIssue.issue_import_key, {
      author_name: actorName || "CS Dashboard",
      entry_type: "state_change",
      body: `Restored issue from review bin${deletedIssue.delete_reason ? ` after deletion reason: ${deletedIssue.delete_reason}` : ""}`
    });
  } catch (historyError) {
    if (!isMissingRelationError(historyError)) {
      throw historyError;
    }
  }

  const { error: cleanupError } = await supabase
    .from("cs_deleted_issues")
    .delete()
    .eq("id", deletedId);

  if (cleanupError) {
    throw cleanupError;
  }

  return getIssueWithAccounts(deletedIssue.issue_import_key);
}

export async function permanentlyDeleteArchivedIssue(deletedId) {
  const { error } = await supabase
    .from("cs_deleted_issues")
    .delete()
    .eq("id", deletedId);

  if (error) {
    if (isMissingRelationError(error)) {
      const missingTableError = new Error(
        "Deleted issues table is not created yet. Run the Supabase migration for cs_deleted_issues first."
      );
      missingTableError.status = 503;
      throw missingTableError;
    }
    throw error;
  }

  return { ok: true };
}

export async function updateDashboardIssue(issueImportKey, updates) {
  const actorName = String(updates?.actor_name || "").trim();
  const allowedFields = [
    "csm",
    "pm",
    "assignee_name",
    "health",
    "priority",
    "current_status",
    "stage_due_date",
    "resolution_eta",
    "next_steps",
    "meeting_notes",
    "product_feedback",
    "customers_affected",
    "support_ticket",
    "dev_jira_ticket",
    "revision_owner",
    "revision_request",
    "attention_snoozed_until",
    "attention_snoozed_by"
  ];

  const payload = Object.fromEntries(
    Object.entries(updates)
      .filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
      .map(([key, value]) => [key, normalizeIssueUpdateValue(key, value)])
  );

  if (!Object.keys(payload).length) {
    const error = new Error("No valid fields supplied for update");
    error.status = 400;
    throw error;
  }

  const { data: previousIssue, error: previousError } = await supabase
    .from("cs_issues")
    .select("*")
    .eq("issue_import_key", issueImportKey)
    .single();

  if (previousError) {
    throw previousError;
  }

  const { data, error } = await supabase
    .from("cs_issues")
    .update(payload)
    .eq("issue_import_key", issueImportKey)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { data: issueAccounts, error: issueAccountsError } = await supabase
    .from("cs_issue_accounts")
    .select("issue_import_key,account_key,is_primary_account,cs_accounts(account_name)")
    .eq("issue_import_key", issueImportKey);

  if (issueAccountsError) {
    throw issueAccountsError;
  }

  const issueAccountsMap = buildIssueAccountsMap(issueAccounts || []);

  const changeLines = Object.keys(payload)
    .filter((key) => String(previousIssue?.[key] ?? "") !== String(data?.[key] ?? ""))
    .map((key) => `Updated ${key.replaceAll("_", " ")}: "${previousIssue?.[key] ?? ""}" -> "${data?.[key] ?? ""}"`);

  if (changeLines.length) {
    try {
      await createIssueUpdate(issueImportKey, {
        author_name: actorName || "CS Dashboard",
        entry_type: "state_change",
        body: changeLines.join("\n")
      });
    } catch (historyError) {
      if (!isMissingRelationError(historyError)) {
        throw historyError;
      }
    }
  }

  return {
    ...data,
    accounts: issueAccountsMap.get(issueImportKey) || []
  };
}

export async function createPrdfForExistingIssue(issueImportKey, payload = {}) {
  const actorName = String(payload.actor_name || "").trim();

  const { data: issue, error: issueError } = await supabase
    .from("cs_issues")
    .select("*")
    .eq("issue_import_key", issueImportKey)
    .single();

  if (issueError) {
    if (isNotFoundError(issueError)) {
      const notFoundError = new Error("Issue not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    throw issueError;
  }

  if (issue.jira_ticket) {
    const conflictError = new Error(`This issue already has PRDF ticket ${issue.jira_ticket} linked.`);
    conflictError.status = 409;
    throw conflictError;
  }

  const jiraIssue = await createPrdfJiraIssue({
    ...issue,
    account_name: issue.account_name_raw
  });

  const updatePayload = { jira_ticket: jiraIssue.key };
  if (issue.logical_issue_key === issue.issue_import_key) {
    updatePayload.logical_issue_key = jiraIssue.key;
  }

  const { error: updateError } = await supabase
    .from("cs_issues")
    .update(updatePayload)
    .eq("issue_import_key", issueImportKey);

  if (updateError) {
    throw updateError;
  }

  try {
    await createIssueUpdate(issueImportKey, {
      author_name: actorName || "CS Dashboard",
      entry_type: "state_change",
      body: `Created PRDF ${jiraIssue.key} in Jira from quick triage`
    });
  } catch (historyError) {
    if (!isMissingRelationError(historyError)) {
      throw historyError;
    }
  }

  return getIssueWithAccounts(issueImportKey);
}

export async function getIssueUpdates(issueImportKey) {
  const { data, error } = await supabase
    .from("cs_issue_updates")
    .select("id,issue_import_key,entry_type,body,author_name,source,created_at")
    .eq("issue_import_key", issueImportKey)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return { historyEnabled: false, updates: [] };
    }
    throw error;
  }

  return {
    historyEnabled: true,
    updates: data || []
  };
}

export async function createIssueUpdate(issueImportKey, payload) {
  const body = String(payload?.body || "").trim();
  const authorName = String(payload?.author_name || "").trim();
  const entryType = String(payload?.entry_type || "meeting_note").trim() || "meeting_note";
  const allowedTypes = ["meeting_note", "customer_update", "product_update", "risk_update", "state_change"];

  if (!body) {
    const error = new Error("Update body is required");
    error.status = 400;
    throw error;
  }

  if (!allowedTypes.includes(entryType)) {
    const error = new Error("Invalid update type supplied");
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from("cs_issue_updates")
    .insert({
      issue_import_key: issueImportKey,
      entry_type: entryType,
      body,
      author_name: authorName || null,
      source: "app"
    })
    .select("id,issue_import_key,entry_type,body,author_name,source,created_at")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      const missingTableError = new Error(
        "Issue history table is not created yet. Run the Supabase migration for cs_issue_updates first."
      );
      missingTableError.status = 503;
      throw missingTableError;
    }
    throw error;
  }

  return data;
}
