import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js";

const NOTE_TYPE_OPTIONS = [
  { value: "discussion", label: "Discussion" },
  { value: "decision", label: "Decision" },
  { value: "risk", label: "Risk" },
  { value: "follow_up", label: "Follow-up" },
  { value: "general", label: "General" }
];

function noteTypeLabel(value) {
  return NOTE_TYPE_OPTIONS.find((option) => option.value === value)?.label || "Note";
}

function noteTypeStyle(value) {
  const map = {
    decision: { background: "#DDF1E4", color: "#1F6B44" },
    risk: { background: "#F8DAE2", color: "#842A42" },
    follow_up: { background: "#FEEADC", color: "#8E5E48" }
  };
  return map[value] || { background: "var(--app-surface-2)", color: "var(--app-text-body)" };
}

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

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-4">
      {eyebrow ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-1 text-[18px] font-semibold" style={{ color: "var(--app-text)" }}>
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
      {children}
    </span>
  );
}

const inputClass =
  "rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2.5 text-sm text-[var(--app-text-body)] outline-none transition focus:border-[var(--app-border-strong)]";

function IssueSelect({ issues, value, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>Linked issue (optional)</FieldLabel>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">No linked issue</option>
        {issues.map((issue) => (
          <option key={issue.issue_import_key} value={issue.issue_import_key}>
            {issue.issue_title}
          </option>
        ))}
      </select>
    </label>
  );
}

function LinkedIssueChip({ issueImportKey, issuesByKey, onSelectIssue }) {
  if (!issueImportKey) return null;
  const issue = issuesByKey.get(issueImportKey);
  if (!issue) {
    return (
      <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: "var(--app-surface-2)", color: "var(--app-text-muted)", border: "1px solid var(--app-border)" }}>
        Linked issue removed
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelectIssue(issue)}
      className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition hover:opacity-80"
      style={{ background: "var(--app-surface-2)", color: "var(--app-text-body)", border: "1px solid var(--app-border)" }}
    >
      {issue.jira_ticket || issue.issue_import_key} · {issue.issue_title.length > 44 ? `${issue.issue_title.slice(0, 44)}…` : issue.issue_title}
    </button>
  );
}

export function MeetingSpaceView({ issues, onSelectIssue, operatorName }) {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState(todayIso());
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [digestDraft, setDigestDraft] = useState("");
  const [savingDigest, setSavingDigest] = useState(false);

  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("discussion");
  const [noteIssueKey, setNoteIssueKey] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [actionDescription, setActionDescription] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionIssueKey, setActionIssueKey] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [togglingActionId, setTogglingActionId] = useState(null);

  const issuesByKey = useMemo(() => {
    return new Map(issues.map((issue) => [issue.issue_import_key, issue]));
  }, [issues]);

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId) || null;

  useEffect(() => {
    async function loadMeetings() {
      setLoading(true);
      setLoadError("");
      try {
        const payload = await requestJson("/api/meetings");
        const loaded = payload.meetings || [];
        setMeetings(loaded);
        setSelectedMeetingId((current) => current ?? loaded[0]?.id ?? null);
      } catch (error) {
        setLoadError(describeFetchError(error, "Could not load meetings."));
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  useEffect(() => {
    setDigestDraft(selectedMeeting?.digest || "");
    setActionError("");
  }, [selectedMeetingId, selectedMeeting?.digest]);

  function replaceMeeting(updatedMeeting) {
    setMeetings((current) =>
      current.map((meeting) =>
        meeting.id === updatedMeeting.id ? { ...meeting, ...updatedMeeting } : meeting
      )
    );
  }

  async function handleCreateMeeting(event) {
    event.preventDefault();
    if (!newMeetingTitle.trim()) return;

    setSavingMeeting(true);
    setActionError("");
    try {
      const payload = await requestJson("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMeetingTitle,
          meeting_date: newMeetingDate || todayIso(),
          actor_name: operatorName
        })
      });

      setMeetings((current) => [payload.meeting, ...current]);
      setSelectedMeetingId(payload.meeting.id);
      setNewMeetingTitle("");
      setNewMeetingDate(todayIso());
      setCreatingMeeting(false);
    } catch (error) {
      setActionError(describeFetchError(error, "Could not create the meeting."));
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleSaveDigest() {
    if (!selectedMeeting) return;

    setSavingDigest(true);
    setActionError("");
    try {
      const payload = await requestJson(`/api/meetings/${selectedMeeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: digestDraft })
      });
      replaceMeeting(payload.meeting);
    } catch (error) {
      setActionError(describeFetchError(error, "Could not save the digest."));
    } finally {
      setSavingDigest(false);
    }
  }

  async function handleAddNote(event) {
    event.preventDefault();
    if (!selectedMeeting || !noteBody.trim()) return;

    setSavingNote(true);
    setActionError("");
    try {
      const payload = await requestJson(`/api/meetings/${selectedMeeting.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: noteBody,
          note_type: noteType,
          issue_import_key: noteIssueKey || null,
          author_name: operatorName
        })
      });

      setMeetings((current) =>
        current.map((meeting) =>
          meeting.id === selectedMeeting.id
            ? { ...meeting, notes: [...(meeting.notes || []), payload.note] }
            : meeting
        )
      );
      setNoteBody("");
      setNoteIssueKey("");
      setNoteType("discussion");
    } catch (error) {
      setActionError(describeFetchError(error, "Could not add the note."));
    } finally {
      setSavingNote(false);
    }
  }

  async function handleAddAction(event) {
    event.preventDefault();
    if (!selectedMeeting || !actionDescription.trim()) return;

    setSavingAction(true);
    setActionError("");
    try {
      const payload = await requestJson(`/api/meetings/${selectedMeeting.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: actionDescription,
          owner_name: actionOwner,
          due_date: actionDueDate || null,
          issue_import_key: actionIssueKey || null,
          actor_name: operatorName
        })
      });

      setMeetings((current) =>
        current.map((meeting) =>
          meeting.id === selectedMeeting.id
            ? { ...meeting, action_items: [...(meeting.action_items || []), payload.actionItem] }
            : meeting
        )
      );
      setActionDescription("");
      setActionOwner("");
      setActionDueDate("");
      setActionIssueKey("");
    } catch (error) {
      setActionError(describeFetchError(error, "Could not add the action item."));
    } finally {
      setSavingAction(false);
    }
  }

  async function handleToggleAction(actionItem) {
    setTogglingActionId(actionItem.id);
    setActionError("");
    try {
      const payload = await requestJson(`/api/meetings/actions/${actionItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionItem.status === "done" ? "open" : "done" })
      });

      setMeetings((current) =>
        current.map((meeting) =>
          meeting.id === actionItem.meeting_id
            ? {
                ...meeting,
                action_items: (meeting.action_items || []).map((item) =>
                  item.id === payload.actionItem.id ? payload.actionItem : item
                )
              }
            : meeting
        )
      );
    } catch (error) {
      setActionError(describeFetchError(error, "Could not update the action item."));
    } finally {
      setTogglingActionId(null);
    }
  }

  const allActionItems = meetings.flatMap((meeting) => meeting.action_items || []);
  const openActionItems = allActionItems.filter((item) => item.status !== "done");
  const totalNotes = meetings.reduce((sum, meeting) => sum + (meeting.notes || []).length, 0);

  const meetingBackedIssues = useMemo(() => {
    return issues.filter((issue) => issue.meeting_notes || issue.next_steps || issue.product_feedback).slice(0, 8);
  }, [issues]);

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <section className="cs-panel px-6 py-6">
        <SectionHeader
          eyebrow="Collaboration workspace"
          title="Meeting space"
          subtitle="Run the weekly CS x Product sync from here: log meetings, capture notes and decisions, and track action items."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Meetings logged", value: meetings.length },
            { label: "Open action items", value: openActionItems.length },
            { label: "Notes captured", value: totalNotes }
          ].map((card) => (
            <div key={card.label} className="rounded-[12px] border px-4 py-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
              <div className="text-[12px] font-semibold" style={{ color: "var(--app-text-muted)" }}>{card.label}</div>
              <div className="mt-3 text-[28px] font-bold" style={{ color: "var(--app-text)" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      {loadError ? (
        <div className="cs-panel px-5 py-4 text-sm text-[#842A42]">{loadError}</div>
      ) : null}

      {!loadError ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.6fr)]">
          <section className="cs-panel self-start overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--app-border)" }}>
              <h3 className="text-[16px] font-semibold" style={{ color: "var(--app-text)" }}>Meetings</h3>
              <button
                type="button"
                className="rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-80"
                style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text-body)" }}
                onClick={() => setCreatingMeeting((current) => !current)}
              >
                {creatingMeeting ? "Cancel" : "New meeting"}
              </button>
            </div>

            {creatingMeeting ? (
              <form onSubmit={handleCreateMeeting} className="flex flex-col gap-3 border-b px-5 py-4" style={{ borderColor: "var(--app-border)" }}>
                <label className="flex flex-col gap-2">
                  <FieldLabel>Title</FieldLabel>
                  <input
                    value={newMeetingTitle}
                    onChange={(event) => setNewMeetingTitle(event.target.value)}
                    placeholder="CS x Product sync"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <FieldLabel>Meeting date</FieldLabel>
                  <input
                    type="date"
                    value={newMeetingDate}
                    onChange={(event) => setNewMeetingDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingMeeting || !newMeetingTitle.trim()}
                  className="cs-primary-button justify-center disabled:opacity-50"
                >
                  {savingMeeting ? "Creating…" : "Create meeting"}
                </button>
              </form>
            ) : null}

            <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
              {loading ? (
                <div className="px-5 py-6 text-sm" style={{ color: "var(--app-text-muted)" }}>Loading meetings…</div>
              ) : meetings.length ? (
                meetings.map((meeting) => {
                  const active = meeting.id === selectedMeetingId;
                  const openCount = (meeting.action_items || []).filter((item) => item.status !== "done").length;
                  return (
                    <button
                      key={meeting.id}
                      type="button"
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="w-full px-5 py-4 text-left transition hover:bg-[var(--app-surface-2)]"
                      style={active ? { background: "var(--app-surface-2)" } : undefined}
                    >
                      <div className="text-[14px] font-semibold" style={{ color: "var(--app-text)" }}>{meeting.title}</div>
                      <div className="mt-1 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                        {formatDateLabel(meeting.meeting_date)} · {(meeting.notes || []).length} notes · {openCount} open actions
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-5 py-6 text-sm" style={{ color: "var(--app-text-muted)" }}>
                  No meetings logged yet. Create the first one to start capturing sync notes.
                </div>
              )}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            {actionError ? (
              <div className="cs-panel px-5 py-4 text-sm text-[#842A42]">{actionError}</div>
            ) : null}

            {selectedMeeting ? (
              <>
                <section className="cs-panel px-6 py-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
                        {selectedMeeting.meeting_type} · {formatDateLabel(selectedMeeting.meeting_date)}
                      </div>
                      <h3 className="mt-1 text-[19px] font-semibold" style={{ color: "var(--app-text)" }}>{selectedMeeting.title}</h3>
                      {selectedMeeting.created_by ? (
                        <div className="mt-1 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                          Logged by {selectedMeeting.created_by}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    <FieldLabel>Meeting digest</FieldLabel>
                    <textarea
                      value={digestDraft}
                      onChange={(event) => setDigestDraft(event.target.value)}
                      rows={4}
                      placeholder="Summarize what the group covered, key decisions, and what changed since last week."
                      className={`${inputClass} leading-6`}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={handleSaveDigest}
                        disabled={savingDigest || digestDraft === (selectedMeeting.digest || "")}
                        className="cs-primary-button disabled:opacity-50"
                      >
                        {savingDigest ? "Saving…" : "Save digest"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="cs-panel overflow-hidden">
                  <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
                    <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Notes</h3>
                  </div>

                  <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                    {(selectedMeeting.notes || []).length ? (
                      selectedMeeting.notes.map((note) => (
                        <div key={note.id} className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={noteTypeStyle(note.note_type)}>
                              {noteTypeLabel(note.note_type)}
                            </span>
                            <LinkedIssueChip issueImportKey={note.issue_import_key} issuesByKey={issuesByKey} onSelectIssue={onSelectIssue} />
                            <span className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                              {note.author_name || "Unattributed"} · {formatDateLabel(note.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-6" style={{ color: "var(--app-text-body)" }}>
                            {note.body}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-5 text-sm" style={{ color: "var(--app-text-muted)" }}>
                        No notes yet for this meeting.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} className="flex flex-col gap-3 border-t px-6 py-5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <FieldLabel>Note type</FieldLabel>
                        <select value={noteType} onChange={(event) => setNoteType(event.target.value)} className={inputClass}>
                          {NOTE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <IssueSelect issues={issues} value={noteIssueKey} onChange={setNoteIssueKey} />
                    </div>
                    <label className="flex flex-col gap-2">
                      <FieldLabel>Note</FieldLabel>
                      <textarea
                        value={noteBody}
                        onChange={(event) => setNoteBody(event.target.value)}
                        rows={3}
                        placeholder="Capture the discussion point, decision, or risk raised in the meeting."
                        className={`${inputClass} leading-6`}
                      />
                    </label>
                    <div>
                      <button type="submit" disabled={savingNote || !noteBody.trim()} className="cs-primary-button disabled:opacity-50">
                        {savingNote ? "Adding…" : "Add note"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="cs-panel overflow-hidden">
                  <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
                    <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Action items</h3>
                  </div>

                  <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                    {(selectedMeeting.action_items || []).length ? (
                      selectedMeeting.action_items.map((item) => {
                        const done = item.status === "done";
                        return (
                          <div key={item.id} className="flex items-start gap-3 px-6 py-4">
                            <input
                              type="checkbox"
                              checked={done}
                              disabled={togglingActionId === item.id}
                              onChange={() => handleToggleAction(item)}
                              className="mt-1 h-4 w-4 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className="text-[14px] font-semibold"
                                style={{ color: done ? "var(--app-text-muted)" : "var(--app-text)", textDecoration: done ? "line-through" : "none" }}
                              >
                                {item.description}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
                                <span>{item.owner_name || "Unassigned"}</span>
                                <span>·</span>
                                <span>{item.due_date ? `Due ${formatDateLabel(item.due_date)}` : "No due date"}</span>
                                {done && item.completed_at ? (
                                  <>
                                    <span>·</span>
                                    <span>Done {formatDateLabel(item.completed_at)}</span>
                                  </>
                                ) : null}
                                <LinkedIssueChip issueImportKey={item.issue_import_key} issuesByKey={issuesByKey} onSelectIssue={onSelectIssue} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-5 text-sm" style={{ color: "var(--app-text-muted)" }}>
                        No action items yet for this meeting.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddAction} className="flex flex-col gap-3 border-t px-6 py-5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                    <label className="flex flex-col gap-2">
                      <FieldLabel>Action item</FieldLabel>
                      <input
                        value={actionDescription}
                        onChange={(event) => setActionDescription(event.target.value)}
                        placeholder="What needs to happen before the next sync?"
                        className={inputClass}
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="flex flex-col gap-2">
                        <FieldLabel>Owner</FieldLabel>
                        <input
                          value={actionOwner}
                          onChange={(event) => setActionOwner(event.target.value)}
                          placeholder="Who owns this"
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <FieldLabel>Due date</FieldLabel>
                        <input
                          type="date"
                          value={actionDueDate}
                          onChange={(event) => setActionDueDate(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <IssueSelect issues={issues} value={actionIssueKey} onChange={setActionIssueKey} />
                    </div>
                    <div>
                      <button type="submit" disabled={savingAction || !actionDescription.trim()} className="cs-primary-button disabled:opacity-50">
                        {savingAction ? "Adding…" : "Add action item"}
                      </button>
                    </div>
                  </form>
                </section>
              </>
            ) : !loading ? (
              <section className="cs-panel px-6 py-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
                Select a meeting on the left, or create a new one to start the weekly sync log.
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {meetingBackedIssues.length ? (
        <section className="cs-panel overflow-hidden">
          <div className="border-b px-6 py-5" style={{ borderColor: "var(--app-border)" }}>
            <h3 className="text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>Issues with meeting context</h3>
            <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted)" }}>
              Issues that already carry meeting notes, next steps, or product feedback on the record itself.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
            {meetingBackedIssues.map((issue) => (
              <button
                key={issue.issue_import_key}
                type="button"
                onClick={() => onSelectIssue(issue)}
                className="w-full px-6 py-4 text-left transition hover:bg-[var(--app-surface-2)]"
              >
                <div className="text-[14px] font-semibold" style={{ color: "var(--app-text)" }}>{issue.issue_title}</div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-5" style={{ color: "var(--app-text-muted)" }}>
                  {issue.meeting_notes || issue.next_steps || issue.product_feedback}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
