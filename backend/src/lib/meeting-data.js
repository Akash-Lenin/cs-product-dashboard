import { supabase } from "./supabase.js";
import { createIssueUpdate } from "./dashboard-data.js";

const NOTE_TYPES = ["discussion", "decision", "risk", "follow_up", "general"];
const ACTION_STATUSES = ["open", "done"];

function isMissingRelationError(error) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function isNotFoundError(error) {
  return error?.code === "PGRST116";
}

function missingTablesError() {
  const error = new Error(
    "Meeting space tables are not created yet. Run the Supabase migration for cs_meetings first."
  );
  error.status = 503;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function logToIssueHistory(issueImportKey, body, authorName) {
  if (!issueImportKey) {
    return;
  }

  try {
    await createIssueUpdate(issueImportKey, {
      author_name: authorName || "Meeting space",
      entry_type: "meeting_note",
      body
    });
  } catch (historyError) {
    // Issue history is a best-effort mirror; a missing history table
    // should not block meeting writes.
    if (historyError?.status !== 503) {
      throw historyError;
    }
  }
}

async function getMeetingRow(meetingId) {
  const { data, error } = await supabase
    .from("cs_meetings")
    .select("*")
    .eq("id", meetingId)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      const notFoundError = new Error("Meeting not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  return data;
}

export async function getMeetings() {
  const [
    { data: meetings, error: meetingsError },
    { data: notes, error: notesError },
    { data: actionItems, error: actionsError }
  ] = await Promise.all([
    supabase
      .from("cs_meetings")
      .select("*")
      .order("meeting_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("cs_meeting_notes")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("cs_meeting_action_items")
      .select("*")
      .order("created_at", { ascending: true })
  ]);

  const firstError = meetingsError || notesError || actionsError;
  if (firstError) {
    if (isMissingRelationError(firstError)) {
      throw missingTablesError();
    }
    throw firstError;
  }

  const notesByMeeting = (notes || []).reduce((acc, note) => {
    if (!acc.has(note.meeting_id)) acc.set(note.meeting_id, []);
    acc.get(note.meeting_id).push(note);
    return acc;
  }, new Map());

  const actionsByMeeting = (actionItems || []).reduce((acc, item) => {
    if (!acc.has(item.meeting_id)) acc.set(item.meeting_id, []);
    acc.get(item.meeting_id).push(item);
    return acc;
  }, new Map());

  return (meetings || []).map((meeting) => ({
    ...meeting,
    notes: notesByMeeting.get(meeting.id) || [],
    action_items: actionsByMeeting.get(meeting.id) || []
  }));
}

export async function createMeeting(payload = {}) {
  const title = String(payload.title || "").trim();
  const actorName = String(payload.actor_name || "").trim();

  if (!title) {
    throw badRequest("Meeting title is required");
  }

  const insertPayload = {
    title,
    meeting_type: String(payload.meeting_type || "").trim() || "CS x Product sync",
    meeting_date: payload.meeting_date || new Date().toISOString().slice(0, 10),
    digest: String(payload.digest || "").trim() || null,
    created_by: actorName || null
  };

  const { data, error } = await supabase
    .from("cs_meetings")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  return { ...data, notes: [], action_items: [] };
}

export async function updateMeeting(meetingId, payload = {}) {
  const allowedFields = ["title", "meeting_type", "meeting_date", "digest"];

  const updates = Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
      .map(([key, value]) => {
        if (key === "meeting_date") {
          return [key, value || null];
        }
        return [key, typeof value === "string" ? value.trim() || null : value];
      })
  );

  if (updates.title === null) {
    throw badRequest("Meeting title cannot be empty");
  }

  if (!Object.keys(updates).length) {
    throw badRequest("No valid fields supplied for update");
  }

  const { data, error } = await supabase
    .from("cs_meetings")
    .update(updates)
    .eq("id", meetingId)
    .select("*")
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      const notFoundError = new Error("Meeting not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  return data;
}

export async function createMeetingNote(meetingId, payload = {}) {
  const body = String(payload.body || "").trim();
  const noteType = String(payload.note_type || "discussion").trim() || "discussion";
  const authorName = String(payload.author_name || "").trim();
  const issueImportKey = String(payload.issue_import_key || "").trim() || null;

  if (!body) {
    throw badRequest("Note body is required");
  }

  if (!NOTE_TYPES.includes(noteType)) {
    throw badRequest("Invalid note type supplied");
  }

  const meeting = await getMeetingRow(meetingId);

  const { data, error } = await supabase
    .from("cs_meeting_notes")
    .insert({
      meeting_id: meeting.id,
      issue_import_key: issueImportKey,
      note_type: noteType,
      body,
      author_name: authorName || null
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  await logToIssueHistory(
    issueImportKey,
    `Meeting note (${meeting.title}, ${meeting.meeting_date}): ${body}`,
    authorName
  );

  return data;
}

export async function createActionItem(meetingId, payload = {}) {
  const description = String(payload.description || "").trim();
  const ownerName = String(payload.owner_name || "").trim();
  const actorName = String(payload.actor_name || "").trim();
  const issueImportKey = String(payload.issue_import_key || "").trim() || null;

  if (!description) {
    throw badRequest("Action item description is required");
  }

  const meeting = await getMeetingRow(meetingId);

  const { data, error } = await supabase
    .from("cs_meeting_action_items")
    .insert({
      meeting_id: meeting.id,
      issue_import_key: issueImportKey,
      description,
      owner_name: ownerName || null,
      due_date: payload.due_date || null,
      status: "open",
      created_by: actorName || null
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  await logToIssueHistory(
    issueImportKey,
    `Action item from ${meeting.title} (${meeting.meeting_date}): ${description}${ownerName ? ` — owner ${ownerName}` : ""}${payload.due_date ? `, due ${payload.due_date}` : ""}`,
    actorName
  );

  return data;
}

export async function updateActionItem(actionId, payload = {}) {
  const allowedFields = ["description", "owner_name", "due_date", "status"];

  const updates = Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
      .map(([key, value]) => {
        if (key === "due_date") {
          return [key, value || null];
        }
        return [key, typeof value === "string" ? value.trim() || null : value];
      })
  );

  if (!Object.keys(updates).length) {
    throw badRequest("No valid fields supplied for update");
  }

  if (updates.description === null) {
    throw badRequest("Action item description cannot be empty");
  }

  if (updates.status && !ACTION_STATUSES.includes(updates.status)) {
    throw badRequest("Invalid action item status supplied");
  }

  if (updates.status === "done") {
    updates.completed_at = new Date().toISOString();
  }
  if (updates.status === "open") {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("cs_meeting_action_items")
    .update(updates)
    .eq("id", actionId)
    .select("*")
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      const notFoundError = new Error("Action item not found");
      notFoundError.status = 404;
      throw notFoundError;
    }
    if (isMissingRelationError(error)) {
      throw missingTablesError();
    }
    throw error;
  }

  return data;
}
