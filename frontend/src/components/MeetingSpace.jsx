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

function FieldLabel({ children }) {
  return (
    <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--app-text-muted)" }}>
      {children}
    </span>
  );
}

function ColumnShell({ title, count, children }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[12px] border" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--app-border)" }}>
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--app-text-muted)" }}>{title}</span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--app-surface)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3.5">{children}</div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="rounded-[10px] border px-3 py-2.5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
      {children}
    </div>
  );
}

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
      {issue.jira_ticket || "Issue"} · {issue.issue_title.length > 34 ? `${issue.issue_title.slice(0, 34)}…` : issue.issue_title}
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

function EditButtons({ onSave, onCancel, saving }) {
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

  const [discussBody, setDiscussBody] = useState("");
  const [discussIssueKey, setDiscussIssueKey] = useState("");
  const [decisionType, setDecisionType] = useState("decision");
  const [decisionBody, setDecisionBody] = useState("");
  const [decisionOwner, setDecisionOwner] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionIssueKey, setActionIssueKey] = useState("");

  const [savingColumn, setSavingColumn] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingActionId, setTogglingActionId] = useState(null);

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
    setEditTarget(null);
    setError("");
  }, [selectedMeetingId]);

  function patchMeetingInState(meetingId, patch) {
    setMeetings((current) =>
      current.map((meeting) => (meeting.id === meetingId ? { ...meeting, ...patch(meeting) } : meeting))
    );
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

  async function addNote({ column, body, noteType, issueKey, owner }) {
    if (!selectedMeeting) return;
    setSavingColumn(column);
    setError("");
    try {
      const payload = await postJson(`/api/meetings/${selectedMeeting.id}/notes`, {
        body,
        note_type: noteType,
        issue_import_key: issueKey || null,
        owner_name: owner || null,
        author_name: operatorName
      });
      patchMeetingInState(selectedMeeting.id, (meeting) => ({ notes: [...(meeting.notes || []), payload.note] }));
      return true;
    } catch (noteError) {
      setError(describeFetchError(noteError, "Could not add the note."));
      return false;
    } finally {
      setSavingColumn("");
    }
  }

  async function handleAddDiscussion(event) {
    event.preventDefault();
    if (!discussBody.trim() && !discussIssueKey) return;
    const ok = await addNote({ column: "discussed", body: discussBody, noteType: "discussion", issueKey: discussIssueKey });
    if (ok) {
      setDiscussBody("");
      setDiscussIssueKey("");
    }
  }

  async function handleAddDecision(event) {
    event.preventDefault();
    if (!decisionBody.trim()) return;
    const ok = await addNote({ column: "decisions", body: decisionBody, noteType: decisionType, owner: decisionOwner });
    if (ok) {
      setDecisionBody("");
      setDecisionOwner("");
      setDecisionType("decision");
    }
  }

  async function handleAddAction(event) {
    event.preventDefault();
    if (!selectedMeeting || !actionDescription.trim()) return;
    setSavingColumn("actions");
    setError("");
    try {
      const payload = await postJson(`/api/meetings/${selectedMeeting.id}/actions`, {
        description: actionDescription,
        owner_name: actionOwner,
        due_date: actionDueDate || null,
        issue_import_key: actionIssueKey || null,
        actor_name: operatorName
      });
      patchMeetingInState(selectedMeeting.id, (meeting) => ({
        action_items: [...(meeting.action_items || []), payload.actionItem]
      }));
      setActionDescription("");
      setActionOwner("");
      setActionDueDate("");
      setActionIssueKey("");
    } catch (actionError) {
      setError(describeFetchError(actionError, "Could not add the action item."));
    } finally {
      setSavingColumn("");
    }
  }

  function startEdit(kind, item) {
    setEditTarget({ kind, id: item.id });
    if (kind === "note") {
      setEditFields({ body: item.body || "", owner_name: item.owner_name || "", note_type: item.note_type });
    } else {
      setEditFields({
        description: item.description || "",
        owner_name: item.owner_name || "",
        due_date: item.due_date || ""
      });
    }
  }

  async function handleSaveEdit() {
    if (!editTarget || !selectedMeeting) return;
    setSavingEdit(true);
    setError("");
    try {
      if (editTarget.kind === "note") {
        const payload = await patchJson(`/api/meetings/notes/${editTarget.id}`, {
          body: editFields.body,
          note_type: editFields.note_type,
          owner_name: editFields.owner_name
        });
        patchMeetingInState(selectedMeeting.id, (meeting) => ({
          notes: (meeting.notes || []).map((note) => (note.id === payload.note.id ? payload.note : note))
        }));
      } else {
        const payload = await patchJson(`/api/meetings/actions/${editTarget.id}`, {
          description: editFields.description,
          owner_name: editFields.owner_name,
          due_date: editFields.due_date || ""
        });
        patchMeetingInState(selectedMeeting.id, (meeting) => ({
          action_items: (meeting.action_items || []).map((item) =>
            item.id === payload.actionItem.id ? payload.actionItem : item
          )
        }));
      }
      setEditTarget(null);
    } catch (editError) {
      setError(describeFetchError(editError, "Could not save the change."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleAction(item) {
    setTogglingActionId(item.id);
    setError("");
    try {
      const payload = await patchJson(`/api/meetings/actions/${item.id}`, {
        status: item.status === "done" ? "open" : "done"
      });
      patchMeetingInState(item.meeting_id, (meeting) => ({
        action_items: (meeting.action_items || []).map((entry) =>
          entry.id === payload.actionItem.id ? payload.actionItem : entry
        )
      }));
    } catch (toggleError) {
      setError(describeFetchError(toggleError, "Could not update the action item."));
    } finally {
      setTogglingActionId(null);
    }
  }

  const notes = selectedMeeting?.notes || [];
  const discussed = notes.filter((note) => DISCUSSION_TYPES.includes(note.note_type));
  const decisions = notes.filter((note) => ["decision", "risk"].includes(note.note_type));
  const actionItems = selectedMeeting?.action_items || [];

  const filteredDecisions = ownerFilter
    ? decisions.filter((note) => (note.owner_name || "") === ownerFilter)
    : decisions;
  const filteredActions = ownerFilter
    ? actionItems.filter((item) => (item.owner_name || "") === ownerFilter)
    : actionItems;

  const ownersInMeeting = useMemo(() => {
    const names = [
      ...decisions.map((note) => note.owner_name),
      ...actionItems.map((item) => item.owner_name)
    ];
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [selectedMeeting]);

  const allOpenActions = meetings.flatMap((meeting) => meeting.action_items || []).filter((item) => item.status !== "done");
  const totalNotes = meetings.reduce((sum, meeting) => sum + (meeting.notes || []).length, 0);
  const isActive = selectedMeeting && selectedMeeting.id === activeMeetingId;

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
                  This meeting is live: the Issues view now shows an "Add to meeting" action on every row.
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

            <div className="grid gap-4 lg:grid-cols-3">
              <ColumnShell title="Discussed" count={discussed.length}>
                {discussed.map((note) =>
                  editTarget?.kind === "note" && editTarget.id === note.id ? (
                    <Card key={note.id}>
                      <textarea
                        value={editFields.body}
                        onChange={(event) => setEditFields((current) => ({ ...current, body: event.target.value }))}
                        rows={3}
                        className={`${inputClass} w-full leading-5`}
                      />
                      <div className="mt-2">
                        <EditButtons onSave={handleSaveEdit} onCancel={() => setEditTarget(null)} saving={savingEdit} />
                      </div>
                    </Card>
                  ) : (
                    <Card key={note.id}>
                      <LinkedIssueChip issueImportKey={note.issue_import_key} issuesByKey={issuesByKey} onSelectIssue={onSelectIssue} />
                      <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-5" style={{ color: "var(--app-text-body)" }}>{note.body}</div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--app-text-muted)" }}>
                        <span>{note.author_name || "Unattributed"}</span>
                        <button type="button" onClick={() => startEdit("note", note)} className="font-semibold underline underline-offset-2">
                          Edit
                        </button>
                      </div>
                    </Card>
                  )
                )}
                {!discussed.length ? (
                  <div className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    Nothing raised yet. Add items here or from the Issues view while this meeting is live.
                  </div>
                ) : null}

                <form onSubmit={handleAddDiscussion} className="mt-1 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--app-border)" }}>
                  <select value={discussIssueKey} onChange={(event) => setDiscussIssueKey(event.target.value)} className={inputClass}>
                    <option value="">No linked issue</option>
                    {issues.map((issue) => (
                      <option key={issue.issue_import_key} value={issue.issue_import_key}>{issue.issue_title}</option>
                    ))}
                  </select>
                  <textarea
                    value={discussBody}
                    onChange={(event) => setDiscussBody(event.target.value)}
                    rows={2}
                    placeholder="What was discussed?"
                    className={`${inputClass} leading-5`}
                  />
                  <button
                    type="submit"
                    disabled={savingColumn === "discussed" || (!discussBody.trim() && !discussIssueKey)}
                    className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-text-body)" }}
                  >
                    {savingColumn === "discussed" ? "Adding…" : "+ Add discussion point"}
                  </button>
                </form>
              </ColumnShell>

              <ColumnShell title="Decisions & risks" count={filteredDecisions.length}>
                {filteredDecisions.map((note) =>
                  editTarget?.kind === "note" && editTarget.id === note.id ? (
                    <Card key={note.id}>
                      <select
                        value={editFields.note_type}
                        onChange={(event) => setEditFields((current) => ({ ...current, note_type: event.target.value }))}
                        className={`${inputClass} w-full`}
                      >
                        <option value="decision">Decision</option>
                        <option value="risk">Risk</option>
                      </select>
                      <textarea
                        value={editFields.body}
                        onChange={(event) => setEditFields((current) => ({ ...current, body: event.target.value }))}
                        rows={3}
                        className={`${inputClass} mt-2 w-full leading-5`}
                      />
                      <div className="mt-2">
                        <PersonInput
                          value={editFields.owner_name}
                          onChange={(value) => setEditFields((current) => ({ ...current, owner_name: value }))}
                          placeholder="Tag an owner"
                        />
                      </div>
                      <div className="mt-2">
                        <EditButtons onSave={handleSaveEdit} onCancel={() => setEditTarget(null)} saving={savingEdit} />
                      </div>
                    </Card>
                  ) : (
                    <Card key={note.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                          style={note.note_type === "risk" ? { background: "#F8DAE2", color: "#842A42" } : { background: "#DDF1E4", color: "#1F6B44" }}
                        >
                          {note.note_type === "risk" ? "Risk" : "Decision"}
                        </span>
                        {note.owner_name ? (
                          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--app-surface-2)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}>
                            @{note.owner_name}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-5" style={{ color: "var(--app-text-body)" }}>{note.body}</div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--app-text-muted)" }}>
                        <span>{note.author_name || "Unattributed"}</span>
                        <button type="button" onClick={() => startEdit("note", note)} className="font-semibold underline underline-offset-2">
                          Edit
                        </button>
                      </div>
                    </Card>
                  )
                )}
                {!filteredDecisions.length ? (
                  <div className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    {ownerFilter ? "Nothing for this owner." : "No decisions or risks captured yet."}
                  </div>
                ) : null}

                <form onSubmit={handleAddDecision} className="mt-1 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--app-border)" }}>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={decisionType} onChange={(event) => setDecisionType(event.target.value)} className={inputClass}>
                      <option value="decision">Decision</option>
                      <option value="risk">Risk</option>
                    </select>
                    <PersonInput value={decisionOwner} onChange={setDecisionOwner} placeholder="Tag owner" />
                  </div>
                  <textarea
                    value={decisionBody}
                    onChange={(event) => setDecisionBody(event.target.value)}
                    rows={2}
                    placeholder="What was decided, or what risk was raised?"
                    className={`${inputClass} leading-5`}
                  />
                  <button
                    type="submit"
                    disabled={savingColumn === "decisions" || !decisionBody.trim()}
                    className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-text-body)" }}
                  >
                    {savingColumn === "decisions" ? "Adding…" : "+ Add decision / risk"}
                  </button>
                </form>
              </ColumnShell>

              <ColumnShell title="Action items" count={filteredActions.length}>
                {filteredActions.map((item) => {
                  const done = item.status === "done";
                  const dueDays = daysUntil(item.due_date);
                  return editTarget?.kind === "action" && editTarget.id === item.id ? (
                    <Card key={item.id}>
                      <input
                        value={editFields.description}
                        onChange={(event) => setEditFields((current) => ({ ...current, description: event.target.value }))}
                        className={`${inputClass} w-full`}
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <PersonInput
                          value={editFields.owner_name}
                          onChange={(value) => setEditFields((current) => ({ ...current, owner_name: value }))}
                          placeholder="Owner"
                        />
                        <input
                          type="date"
                          value={editFields.due_date}
                          onChange={(event) => setEditFields((current) => ({ ...current, due_date: event.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div className="mt-2">
                        <EditButtons onSave={handleSaveEdit} onCancel={() => setEditTarget(null)} saving={savingEdit} />
                      </div>
                    </Card>
                  ) : (
                    <Card key={item.id}>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={togglingActionId === item.id}
                          onChange={() => handleToggleAction(item)}
                          className="mt-0.5 h-4 w-4 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[12.5px] font-semibold leading-5"
                            style={{ color: done ? "var(--app-text-muted)" : "var(--app-text)", textDecoration: done ? "line-through" : "none" }}
                          >
                            {item.description}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: "var(--app-text-muted)" }}>
                            <span>@{item.owner_name || "Unassigned"}</span>
                            <span>·</span>
                            <span style={{ color: !done && dueDays !== null && dueDays < 0 ? "#842A42" : undefined }}>
                              {done
                                ? "Done"
                                : item.due_date
                                  ? dueDays < 0
                                    ? `${Math.abs(dueDays)}d overdue`
                                    : `Due ${formatDateLabel(item.due_date)}`
                                  : "No due date"}
                            </span>
                            <LinkedIssueChip issueImportKey={item.issue_import_key} issuesByKey={issuesByKey} onSelectIssue={onSelectIssue} />
                          </div>
                        </div>
                        <button type="button" onClick={() => startEdit("action", item)} className="shrink-0 text-[11px] font-semibold underline underline-offset-2" style={{ color: "var(--app-text-muted)" }}>
                          Edit
                        </button>
                      </div>
                    </Card>
                  );
                })}
                {!filteredActions.length ? (
                  <div className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                    {ownerFilter ? "Nothing for this owner." : "No action items yet."}
                  </div>
                ) : null}

                <form onSubmit={handleAddAction} className="mt-1 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--app-border)" }}>
                  <input
                    value={actionDescription}
                    onChange={(event) => setActionDescription(event.target.value)}
                    placeholder="What needs to happen?"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <PersonInput value={actionOwner} onChange={setActionOwner} placeholder="Owner" />
                    <input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} className={inputClass} />
                  </div>
                  <select value={actionIssueKey} onChange={(event) => setActionIssueKey(event.target.value)} className={inputClass}>
                    <option value="">No linked issue</option>
                    {issues.map((issue) => (
                      <option key={issue.issue_import_key} value={issue.issue_import_key}>{issue.issue_title}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={savingColumn === "actions" || !actionDescription.trim()}
                    className="rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-text-body)" }}
                  >
                    {savingColumn === "actions" ? "Adding…" : "+ Add action item"}
                  </button>
                </form>
              </ColumnShell>
            </div>
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
