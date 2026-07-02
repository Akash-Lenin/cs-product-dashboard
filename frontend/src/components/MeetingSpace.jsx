import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js";

const DISCUSSION_TYPES = ["discussion", "general", "follow_up"];

function formatDateLabel(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function describeFetchError(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return "The app could not reach the backend. Make sure the backend server is running on port 4000, then refresh.";
  }
  return error?.message || fallbackMessage;
}

async function requestJson(url, options) {
  const response = await apiFetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed: ${response.status}`);
  }
  return payload;
}

function postJson(url, body) {
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function patchJson(url, body) {
  return requestJson(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const inputClass =
  "rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[12.5px] text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]";

function LinkedIssueChip({ issueImportKey, issuesByKey, onSelectIssue }) {
  if (!issueImportKey) return null;
  const issue = issuesByKey.get(issueImportKey);
  if (!issue) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--app-surface-2)", color: "var(--app-text-muted)", border: "1px solid var(--app-border)" }}>
        Issue removed
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelectIssue(issue)}
      className="max-w-full truncate rounded-full px-2 py-0.5 text-left text-[10.5px] font-semibold transition hover:opacity-80"
      style={{ background: "var(--app-surface-2)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}
      title={issue.issue_title}
    >
      {issue.jira_ticket || "Issue"} · {issue.issue_title.length > 30 ? `${issue.issue_title.slice(0, 30)}…` : issue.issue_title}
    </button>
  );
}

function PersonInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder || "Tag a person"}
      list="cs-people-options"
      className={inputClass}
    />
  );
}

function SaveCancel({ onSave, onCancel, saving }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold text-[#FAFAF7] disabled:opacity-50"
        style={{ background: "var(--app-sidebar)" }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-[8px] border px-2.5 py-1 text-[11.5px] font-semibold"
        style={{ borderColor: "var(--app-border)", color: "var(--app-text-body)" }}
      >
        Cancel
      </button>
    </div>
  );
}

function CellLabel({ children }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] lg:hidden" style={{ color: "var(--app-text-muted)" }}>
      {children}
    </div>
  );
}

const rowGrid = "grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.25fr)_120px_minmax(0,1.05fr)]";

export function MeetingSpaceView({
  issues,
  meetings,
  setMeetings,
  onSelectIssue,
  operatorName,
  activeMeetingId,
  onSetActiveMeeting,
  focusMeetingId,
  onConsumeFocus
}) {
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [error, setError] = useState("");

  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState(todayIso());
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [digestDraft, setDigestDraft] = useState("");
  const [savingDigest, setSavingDigest] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("");

  const [newTopicBody, setNewTopicBody] = useState("");
  const [newTopicIssueKey, setNewTopicIssueKey] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);

  const [editTopicId, setEditTopicId] = useState(null);
  const [editTopicBody, setEditTopicBody] = useState("");
  const [editDecisionId, setEditDecisionId] = useState(null);
  const [editDecisionText, setEditDecisionText] = useState("");
  const [editDecisionOwner, setEditDecisionOwner] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [actionRowNoteId, setActionRowNoteId] = useState(null);
  const [rowActionText, setRowActionText] = useState("");
  const [rowActionDue, setRowActionDue] = useState("");
  const [savingRowAction, setSavingRowAction] = useState(false);
  const [togglingActionId, setTogglingActionId] = useState(null);

  const [generalActionText, setGeneralActionText] = useState("");
  const [generalActionOwner, setGeneralActionOwner] = useState("");
  const [generalActionDue, setGeneralActionDue] = useState("");
  const [savingGeneralAction, setSavingGeneralAction] = useState(false);

  const issuesByKey = useMemo(() => new Map(issues.map((issue) => [issue.issue_import_key, issue])), [issues]);

  const people = useMemo(() => {
    const names = issues.flatMap((issue) => [issue.csm, issue.pm, issue.assignee_name, issue.revision_owner]);
    if (operatorName) names.push(operatorName);
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [issues, operatorName]);

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId) || null;

  useEffect(() => {
    if (focusMeetingId) {
      setSelectedMeetingId(focusMeetingId);
      onConsumeFocus();
    }
  }, [focusMeetingId, onConsumeFocus]);

  useEffect(() => {
    if (selectedMeetingId === null && meetings.length) {
      setSelectedMeetingId(
        meetings.some((meeting) => meeting.id === activeMeetingId) ? activeMeetingId : meetings[0].id
      );
    }
  }, [meetings, selectedMeetingId, activeMeetingId]);

  useEffect(() => {
    setDigestDraft(selectedMeeting?.digest || "");
    setEditTopicId(null);
    setEditDecisionId(null);
    setActionRowNoteId(null);
    setError("");
  }, [selectedMeetingId]);

  function patchMeetingInState(meetingId, patch) {
    setMeetings((current) =>
      current.map((meeting) => (meeting.id === meetingId ? { ...meeting, ...patch(meeting) } : meeting))
    );
  }

  function replaceNote(note) {
    patchMeetingInState(note.meeting_id, (meeting) => ({
      notes: (meeting.notes || []).map((entry) => (entry.id === note.id ? note : entry))
    }));
  }

  function replaceAction(action) {
    patchMeetingInState(action.meeting_id, (meeting) => ({
      action_items: (meeting.action_items || []).map((entry) => (entry.id === action.id ? action : entry))
    }));
  }

  async function handleCreateMeeting(event) {
    event.preventDefault();
    if (!newMeetingTitle.trim()) return;

    setSavingMeeting(true);
    setError("");
    try {
      const payload = await postJson("/api/meetings", {
        title: newMeetingTitle,
        meeting_date: newMeetingDate || todayIso(),
        actor_name: operatorName
      });

      setMeetings((current) => [payload.meeting, ...current]);
      setSelectedMeetingId(payload.meeting.id);
      onSetActiveMeeting(payload.meeting.id);
      setNewMeetingTitle("");
      setNewMeetingDate(todayIso());
      setCreatingMeeting(false);
    } catch (createError) {
      setError(describeFetchError(createError, "Could not create the meeting."));
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleSaveDigest() {
    if (!selectedMeeting) return;
    setSavingDigest(true);
    setError("");
    try {
      const payload = await patchJson(`/api/meetings/${selectedMeeting.id}`, { digest: digestDraft });
      patchMeetingInState(selectedMeeting.id, () => ({ digest: payload.meeting.digest }));
    } catch (digestError) {
      setError(describeFetchError(digestError, "Could not save the digest."));
    } finally {
      setSavingDigest(false);
    }
  }

  async function handleAddTopic(event) {
    event.preventDefault();
    if (!selectedMeeting || (!newTopicBody.trim() && !newTopicIssueKey)) return;
    setSavingTopic(true);
    setError("");
    try {
      const payload = await postJson(`/api/meetings/${selectedMeeting.id}/notes`, {
        body: newTopicBody,
        note_type: "discussion",
        issue_import_key: newTopicIssueKey || null,
        author_name: operatorName
      });
      patchMeetingInState(selectedMeeting.id, (meeting) => ({ notes: [...(meeting.notes || []), payload.note] }));
      setNewTopicBody("");
      setNewTopicIssueKey("");
    } catch (topicError) {
      setError(describeFetchError(topicError, "Could not add the topic."));
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleSaveTopicBody(topic) {
    setSavingEdit(true);
    setError("");
    try {
      const payload = await patchJson(`/api/meetings/notes/${topic.id}`, { body: editTopicBody });
      replaceNote(payload.note);
      setEditTopicId(null);
    } catch (editError) {
      setError(describeFetchError(editError, "Could not save the topic."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveDecision(topic) {
    setSavingEdit(true);
    setError("");
    try {
      const payload = await patchJson(`/api/meetings/notes/${topic.id}`, {
        decision: editDecisionText,
        owner_name: editDecisionOwner,
        actor_name: operatorName
      });
      replaceNote(payload.note);
      setEditDecisionId(null);
    } catch (editError) {
      setError(describeFetchError(editError, "Could not save the decision."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddRowAction(topic) {
    if (!rowActionText.trim() || !selectedMeeting) return;
    setSavingRowAction(true);
    setError("");
    try {
      const payload = await postJson(`/api/meetings/${selectedMeeting.id}/actions`, {
        description: rowActionText,
        owner_name: topic.owner_name || "",
        due_date: rowActionDue || null,
        issue_import_key: topic.issue_import_key || null,
        note_id: topic.id,
        actor_name: operatorName
      });
      patchMeetingInState(selectedMeeting.id, (meeting) => ({
        action_items: [...(meeting.action_items || []), payload.actionItem]
      }));
      setRowActionText("");
      setRowActionDue("");
      setActionRowNoteId(null);
    } catch (actionError) {
      setError(describeFetchError(actionError, "Could not add the action item."));
    } finally {
      setSavingRowAction(false);
    }
  }

  async function handleAddGeneralAction(event) {
    event.preventDefault();
    if (!generalActionText.trim() || !selectedMeeting) return;
    setSavingGeneralAction(true);
    setError("");
    try {
      const payload = await postJson(`/api/meetings/${selectedMeeting.id}/actions`, {
        description: generalActionText,
        owner_name: generalActionOwner,
        due_date: generalActionDue || null,
        actor_name: operatorName
      });
      patchMeetingInState(selectedMeeting.id, (meeting) => ({
        action_items: [...(meeting.action_items || []), payload.actionItem]
      }));
      setGeneralActionText("");
      setGeneralActionOwner("");
      setGeneralActionDue("");
    } catch (actionError) {
      setError(describeFetchError(actionError, "Could not add the action item."));
    } finally {
      setSavingGeneralAction(false);
    }
  }

  async function handleToggleAction(item) {
    setTogglingActionId(item.id);
    setError("");
    try {
      const payload = await patchJson(`/api/meetings/actions/${item.id}`, {
        status: item.status === "done" ? "open" : "done"
      });
      replaceAction(payload.actionItem);
    } catch (toggleError) {
      setError(describeFetchError(toggleError, "Could not update the action item."));
    } finally {
      setTogglingActionId(null);
    }
  }

  const notes = selectedMeeting?.notes || [];
  const topics = notes.filter((note) => DISCUSSION_TYPES.includes(note.note_type));
  const legacyNotes = notes.filter((note) => ["decision", "risk"].includes(note.note_type));
  const actionItems = selectedMeeting?.action_items || [];
  const actionsByNote = useMemo(() => {
    const map = new Map();
    for (const item of actionItems) {
      if (!item.note_id) continue;
      if (!map.has(item.note_id)) map.set(item.note_id, []);
      map.get(item.note_id).push(item);
    }
    return map;
  }, [actionItems]);
  const generalActions = actionItems.filter((item) => !item.note_id);

  const visibleTopics = ownerFilter
    ? topics.filter(
        (topic) =>
          topic.owner_name === ownerFilter ||
          (actionsByNote.get(topic.id) || []).some((item) => item.owner_name === ownerFilter)
      )
    : topics;
  const visibleGeneralActions = ownerFilter
    ? generalActions.filter((item) => item.owner_name === ownerFilter)
    : generalActions;

  const ownersInMeeting = useMemo(() => {
    const names = [
      ...topics.map((topic) => topic.owner_name),
      ...actionItems.map((item) => item.owner_name)
    ];
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [selectedMeeting]);

  const allOpenActions = meetings.flatMap((meeting) => meeting.action_items || []).filter((item) => item.status !== "done");
  const totalNotes = meetings.reduce((sum, meeting) => sum + (meeting.notes || []).length, 0);
  const isActive = selectedMeeting && selectedMeeting.id === activeMeetingId;

  function renderActionChip(item) {
    const done = item.status === "done";
    const dueDays = daysUntil(item.due_date);
    return (
      <div key={item.id} className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={done}
          disabled={togglingActionId === item.id}
          onChange={() => handleToggleAction(item)}
          className="mt-0.5 h-3.5 w-3.5 cursor-pointer"
        />
        <div className="min-w-0">
          <span
            className="text-[12px] leading-5"
            style={{ color: done ? "var(--app-text-muted)" : "var(--app-text-body)", textDecoration: done ? "line-through" : "none" }}
          >
            {item.description}
          </span>
          <div className="text-[10.5px]" style={{ color: !done && dueDays !== null && dueDays < 0 ? "#842A42" : "var(--app-text-muted)" }}>
            @{item.owner_name || "Unassigned"}
            {item.due_date ? ` · ${dueDays < 0 && !done ? `${Math.abs(dueDays)}d overdue` : formatDateLabel(item.due_date)}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[1280px] flex-col gap-6">
      <datalist id="cs-people-options">
        {people.map((person) => (
          <option key={person} value={person} />
        ))}
      </datalist>

      <section className="cs-panel px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
              Collaboration workspace
            </div>
            <h2 className="mt-1 text-[18px] font-semibold" style={{ color: "var(--app-text)" }}>Meeting space</h2>
          </div>
          <div className="flex flex-wrap gap-5 text-[12.5px]" style={{ color: "var(--app-text-muted)" }}>
            <span><strong style={{ color: "var(--app-text)" }}>{meetings.length}</strong> meetings</span>
            <span><strong style={{ color: "var(--app-text)" }}>{allOpenActions.length}</strong> open action items</span>
            <span><strong style={{ color: "var(--app-text)" }}>{totalNotes}</strong> notes</span>
          </div>
        </div>
      </section>

      {error ? <div className="cs-panel px-5 py-4 text-sm text-[#842A42]">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <section className="cs-panel self-start overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: "var(--app-border)" }}>
            <h3 className="text-[14px] font-semibold" style={{ color: "var(--app-text)" }}>Meetings</h3>
            <button
              type="button"
              className="rounded-[8px] border px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
              onClick={() => setCreatingMeeting((current) => !current)}
            >
              {creatingMeeting ? "Cancel" : "New"}
            </button>
          </div>

          {creatingMeeting ? (
            <form onSubmit={handleCreateMeeting} className="flex flex-col gap-2.5 border-b px-4 py-3.5" style={{ borderColor: "var(--app-border)" }}>
              <input
                value={newMeetingTitle}
                onChange={(event) => setNewMeetingTitle(event.target.value)}
                placeholder="CS x Product sync"
                className={inputClass}
              />
              <input
                type="date"
                value={newMeetingDate}
                onChange={(event) => setNewMeetingDate(event.target.value)}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={savingMeeting || !newMeetingTitle.trim()}
                className="rounded-[8px] px-3 py-2 text-[12px] font-semibold text-[#FAFAF7] disabled:opacity-50"
                style={{ background: "var(--app-sidebar)" }}
              >
                {savingMeeting ? "Creating…" : "Create & start"}
              </button>
            </form>
          ) : null}

          <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
            {meetings.length ? (
              meetings.map((meeting) => {
                const selected = meeting.id === selectedMeetingId;
                const openCount = (meeting.action_items || []).filter((item) => item.status !== "done").length;
                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                    className="w-full px-4 py-3 text-left transition hover:bg-[var(--app-surface-2)]"
                    style={selected ? { background: "var(--app-surface-2)" } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold" style={{ color: "var(--app-text)" }}>{meeting.title}</span>
                      {meeting.id === activeMeetingId ? (
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em]" style={{ background: "#DDF1E4", color: "#1F6B44" }}>
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--app-text-muted)" }}>
                      {formatDateLabel(meeting.meeting_date)} · {openCount} open
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5 text-[12.5px]" style={{ color: "var(--app-text-muted)" }}>
                No meetings yet. Create one to start the board.
              </div>
            )}
          </div>
        </section>

        {selectedMeeting ? (
          <div className="flex min-w-0 flex-col gap-4">
            <section className="cs-panel px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
                    {selectedMeeting.meeting_type} · {formatDateLabel(selectedMeeting.meeting_date)}
                  </div>
                  <h3 className="mt-0.5 truncate text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>{selectedMeeting.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ownersInMeeting.length ? (
                    <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className={inputClass}>
                      <option value="">All owners</option>
                      {ownersInMeeting.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  ) : null}
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => onSetActiveMeeting(null)}
                      className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold"
                      style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
                    >
                      End meeting
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetActiveMeeting(selectedMeeting.id)}
                      className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-[#FAFAF7]"
                      style={{ background: "var(--app-sidebar)" }}
                    >
                      Make current
                    </button>
                  )}
                </div>
              </div>

              {isActive ? (
                <p className="mt-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                  This meeting is live: the Issues view shows an "Add to meeting" action on every row.
                </p>
              ) : null}

              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={digestDraft}
                  onChange={(event) => setDigestDraft(event.target.value)}
                  rows={2}
                  placeholder="Meeting digest: a two-line summary of what happened."
                  className={`${inputClass} flex-1 leading-5`}
                />
                <button
                  type="button"
                  onClick={handleSaveDigest}
                  disabled={savingDigest || digestDraft === (selectedMeeting.digest || "")}
                  className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                  style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
                >
                  {savingDigest ? "Saving…" : "Save"}
                </button>
              </div>
            </section>

            <section className="cs-panel overflow-hidden">
              <div className={`${rowGrid} hidden border-b px-5 py-3 lg:grid`} style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                {["Discussed", "Decision", "Owner", "Action items"].map((label) => (
                  <div key={label} className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--app-text-muted)" }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {visibleTopics.length ? (
                  visibleTopics.map((topic) => {
                    const rowActions = actionsByNote.get(topic.id) || [];
                    const editingTopic = editTopicId === topic.id;
                    const editingDecision = editDecisionId === topic.id;
                    const addingAction = actionRowNoteId === topic.id;

                    return (
                      <div key={topic.id} className={`${rowGrid} px-5 py-4`}>
                        <div className="min-w-0">
                          <CellLabel>Discussed</CellLabel>
                          <LinkedIssueChip issueImportKey={topic.issue_import_key} issuesByKey={issuesByKey} onSelectIssue={onSelectIssue} />
                          {editingTopic ? (
                            <div className="mt-1.5">
                              <textarea
                                value={editTopicBody}
                                onChange={(event) => setEditTopicBody(event.target.value)}
                                rows={3}
                                className={`${inputClass} w-full leading-5`}
                              />
                              <div className="mt-2">
                                <SaveCancel onSave={() => handleSaveTopicBody(topic)} onCancel={() => setEditTopicId(null)} saving={savingEdit} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5" style={{ color: "var(--app-text-body)" }}>{topic.body}</div>
                              <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: "var(--app-text-muted)" }}>
                                <span>{topic.author_name || "Unattributed"}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditTopicId(topic.id);
                                    setEditTopicBody(topic.body || "");
                                  }}
                                  className="font-semibold underline underline-offset-2"
                                >
                                  Edit
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="min-w-0">
                          <CellLabel>Decision</CellLabel>
                          {editingDecision ? (
                            <div>
                              <textarea
                                value={editDecisionText}
                                onChange={(event) => setEditDecisionText(event.target.value)}
                                rows={3}
                                placeholder="What did the group decide on this?"
                                className={`${inputClass} w-full leading-5`}
                              />
                              <div className="mt-2">
                                <PersonInput value={editDecisionOwner} onChange={setEditDecisionOwner} placeholder="Tag decision owner" />
                              </div>
                              <div className="mt-2">
                                <SaveCancel onSave={() => handleSaveDecision(topic)} onCancel={() => setEditDecisionId(null)} saving={savingEdit} />
                              </div>
                            </div>
                          ) : topic.decision ? (
                            <div>
                              <div className="whitespace-pre-wrap text-[13px] leading-5" style={{ color: "var(--app-text-body)" }}>{topic.decision}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDecisionId(topic.id);
                                  setEditDecisionText(topic.decision || "");
                                  setEditDecisionOwner(topic.owner_name || "");
                                }}
                                className="mt-1 text-[11px] font-semibold underline underline-offset-2"
                                style={{ color: "var(--app-text-muted)" }}
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditDecisionId(topic.id);
                                setEditDecisionText("");
                                setEditDecisionOwner(topic.owner_name || "");
                              }}
                              className="rounded-[8px] border border-dashed px-2.5 py-1.5 text-[12px] font-semibold"
                              style={{ borderColor: "var(--app-border-strong)", color: "var(--app-text-muted)" }}
                            >
                              + Add decision
                            </button>
                          )}
                        </div>

                        <div className="min-w-0">
                          <CellLabel>Owner</CellLabel>
                          {topic.owner_name ? (
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--app-surface-2)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}>
                              @{topic.owner_name}
                            </span>
                          ) : (
                            <span className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>—</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <CellLabel>Action items</CellLabel>
                          <div className="flex flex-col gap-2">
                            {rowActions.map(renderActionChip)}
                            {addingAction ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  value={rowActionText}
                                  onChange={(event) => setRowActionText(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      handleAddRowAction(topic);
                                    }
                                  }}
                                  placeholder="What needs to happen?"
                                  className={inputClass}
                                  autoFocus
                                />
                                <input type="date" value={rowActionDue} onChange={(event) => setRowActionDue(event.target.value)} className={inputClass} />
                                <SaveCancel
                                  onSave={() => handleAddRowAction(topic)}
                                  onCancel={() => {
                                    setActionRowNoteId(null);
                                    setRowActionText("");
                                    setRowActionDue("");
                                  }}
                                  saving={savingRowAction}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActionRowNoteId(topic.id)}
                                className="self-start rounded-[8px] border border-dashed px-2 py-1 text-[11px] font-semibold"
                                style={{ borderColor: "var(--app-border-strong)", color: "var(--app-text-muted)" }}
                              >
                                + Action
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-5 py-6 text-[13px]" style={{ color: "var(--app-text-muted)" }}>
                    {ownerFilter ? "Nothing for this owner in this meeting." : "No topics yet. Add one below, or raise issues from the Issues view while this meeting is live."}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddTopic} className="flex flex-wrap items-center gap-2 border-t px-5 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                <select value={newTopicIssueKey} onChange={(event) => setNewTopicIssueKey(event.target.value)} className={`${inputClass} max-w-[240px]`}>
                  <option value="">No linked issue</option>
                  {issues.map((issue) => (
                    <option key={issue.issue_import_key} value={issue.issue_import_key}>{issue.issue_title}</option>
                  ))}
                </select>
                <input
                  value={newTopicBody}
                  onChange={(event) => setNewTopicBody(event.target.value)}
                  placeholder="What was discussed?"
                  className={`${inputClass} min-w-[200px] flex-1`}
                />
                <button
                  type="submit"
                  disabled={savingTopic || (!newTopicBody.trim() && !newTopicIssueKey)}
                  className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-[#FAFAF7] disabled:opacity-40"
                  style={{ background: "var(--app-sidebar)" }}
                >
                  {savingTopic ? "Adding…" : "+ Add topic"}
                </button>
              </form>
            </section>

            <section className="cs-panel px-5 py-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--app-text-muted)" }}>
                General action items · {visibleGeneralActions.filter((item) => item.status !== "done").length} open
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                {visibleGeneralActions.length ? (
                  visibleGeneralActions.map(renderActionChip)
                ) : (
                  <div className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    {ownerFilter ? "Nothing for this owner." : "No meeting-level action items."}
                  </div>
                )}
              </div>
              <form onSubmit={handleAddGeneralAction} className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--app-border)" }}>
                <input
                  value={generalActionText}
                  onChange={(event) => setGeneralActionText(event.target.value)}
                  placeholder="Action item not tied to a topic"
                  className={`${inputClass} min-w-[200px] flex-1`}
                />
                <PersonInput value={generalActionOwner} onChange={setGeneralActionOwner} placeholder="Owner" />
                <input type="date" value={generalActionDue} onChange={(event) => setGeneralActionDue(event.target.value)} className={inputClass} />
                <button
                  type="submit"
                  disabled={savingGeneralAction || !generalActionText.trim()}
                  className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                  style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
                >
                  {savingGeneralAction ? "Adding…" : "+ Add"}
                </button>
              </form>
            </section>

            {legacyNotes.length ? (
              <section className="cs-panel px-5 py-4">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--app-text-muted)" }}>
                  Standalone decisions & risks (older format)
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {legacyNotes.map((note) => (
                    <div key={note.id} className="flex flex-wrap items-start gap-2 text-[12.5px]" style={{ color: "var(--app-text-body)" }}>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={note.note_type === "risk" ? { background: "#F8DAE2", color: "#842A42" } : { background: "#DDF1E4", color: "#1F6B44" }}
                      >
                        {note.note_type === "risk" ? "Risk" : "Decision"}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap leading-5">{note.body}</span>
                      {note.owner_name ? <span style={{ color: "var(--app-text-muted)" }}>@{note.owner_name}</span> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="cs-panel px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
            Select a meeting on the left, or create one — it opens straight into the board and goes live.
          </section>
        )}
      </div>
    </div>
  );
}
