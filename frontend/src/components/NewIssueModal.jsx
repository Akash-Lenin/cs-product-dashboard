import { useEffect, useState } from "react";

const initialForm = {
  issue_title: "",
  account_name: "",
  business_impact: "",
  priority: "Medium",
  health: "Amber",
  current_status: "Open",
  assignee_name: "",
  csm: "",
  pm: "",
  jira_ticket: "",
  dev_jira_ticket: "",
  stage_due_date: ""
};

const flowContent = {
  tracker: {
    title: "New tracker issue",
    subtitle: "Log a customer-reported request in the dashboard first. You can add the PRDF later when the request is ready.",
    submitLabel: "Create tracker issue",
    jiraPlaceholder: "Optional existing PRDF key",
    createPrdfInJira: false
  },
  prdf: {
    title: "New PRDF issue",
    subtitle: "Log the request in the tracker and create the PRDF ticket in Jira from the same flow.",
    submitLabel: "Create issue and PRDF",
    jiraPlaceholder: "Leave blank to create one in Jira",
    createPrdfInJira: true
  }
};

function InputField({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="cs-create-field">
      <span>{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="cs-create-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NewIssueModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSaving(false);
      setError("");
      setMode(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const content = mode ? flowContent[mode] : null;
  const showJiraFields = mode === "prdf";

  async function handleSubmit(event) {
    event.preventDefault();
    if (!mode) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onCreate({
        ...form,
        create_prdf_in_jira: content.createPrdfInJira
      });
      setForm(initialForm);
      setMode(null);
    } catch (createError) {
      setError(createError.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cs-create-overlay">
      <button type="button" className="cs-create-scrim" onClick={onClose} aria-label="Close new issue" />
      <form className="cs-create-modal" onSubmit={handleSubmit}>
        <div className="cs-create-header">
          <div>
            <h2>{content?.title || "Choose issue flow"}</h2>
            <p>
              {content?.subtitle ||
                "Start with a tracker-only issue, or create the issue together with its PRDF in Jira."}
            </p>
          </div>
          <button type="button" className="cs-create-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        {error ? <div className="cs-create-error">{error}</div> : null}

        {!mode ? (
          <div className="cs-create-choice-grid">
            <button
              type="button"
              className="cs-create-choice"
              onClick={() => {
                setError("");
                setMode("tracker");
              }}
            >
              <span className="cs-create-choice-label">Tracker issue only</span>
              <strong>Capture the request now</strong>
              <p>Create the dashboard row first, then add a PRDF later when the request is ready for product intake.</p>
            </button>

            <button
              type="button"
              className="cs-create-choice"
              onClick={() => {
                setError("");
                setMode("prdf");
              }}
            >
              <span className="cs-create-choice-label">Create PRDF in Jira</span>
              <strong>Log it and open the PRDF path</strong>
              <p>Create the tracker row and let the backend create or link the Jira PRDF ticket in the same step.</p>
            </button>
          </div>
        ) : (
          <>
            <div className="cs-create-mode-row">
              <button type="button" className="cs-create-secondary" onClick={() => setMode(null)}>
                Back
              </button>
              <div className="cs-create-mode-pill">
                {mode === "tracker" ? "Tracker-only flow" : "Jira-backed PRDF flow"}
              </div>
            </div>

            <div className="cs-create-grid">
              <InputField
                label="Issue title"
                value={form.issue_title}
                required
                placeholder="Example: SSO sync dropping role mapping"
                onChange={(value) => update("issue_title", value)}
              />
              <InputField
                label="Account"
                value={form.account_name}
                required
                placeholder="Customer account name"
                onChange={(value) => update("account_name", value)}
              />
              <SelectField
                label="Health"
                value={form.health}
                onChange={(value) => update("health", value)}
                options={["Green", "Amber", "Red"]}
              />
              <SelectField
                label="Priority"
                value={form.priority}
                onChange={(value) => update("priority", value)}
                options={["High", "Medium", "Low"]}
              />
              <SelectField
                label="Status"
                value={form.current_status}
                onChange={(value) => update("current_status", value)}
                options={["Open", "Planned", "In Discovery", "In Development", "Under Review", "Blocked", "Released"]}
              />
              <InputField
                label="Assignee"
                value={form.assignee_name}
                placeholder="Owner for this stage"
                onChange={(value) => update("assignee_name", value)}
              />
              <InputField
                label="CSM"
                value={form.csm}
                placeholder="Customer success owner"
                onChange={(value) => update("csm", value)}
              />
              <InputField
                label="PM"
                value={form.pm}
                placeholder="Product owner"
                onChange={(value) => update("pm", value)}
              />
              {showJiraFields ? (
                <InputField
                  label="PRD/Jira ticket"
                  value={form.jira_ticket}
                  placeholder={content.jiraPlaceholder}
                  onChange={(value) => update("jira_ticket", value)}
                />
              ) : null}
              <InputField
                label="Dev Jira ticket"
                value={form.dev_jira_ticket}
                placeholder="DEV-1234"
                onChange={(value) => update("dev_jira_ticket", value)}
              />
              <label className="cs-create-field">
                <span>Stage due date</span>
                <input
                  type="date"
                  value={form.stage_due_date}
                  onChange={(event) => update("stage_due_date", event.target.value)}
                />
              </label>
            </div>

            <label className="cs-create-field">
              <span>Business impact</span>
              <textarea
                value={form.business_impact}
                rows={4}
                placeholder="Why this matters to the customer or revenue"
                onChange={(event) => update("business_impact", event.target.value)}
              />
            </label>
          </>
        )}

        <div className="cs-create-actions">
          <button type="button" className="cs-create-secondary" onClick={onClose}>
            Cancel
          </button>
          {mode ? (
            <button type="submit" className="cs-create-primary" disabled={saving}>
              {saving ? "Creating..." : content.submitLabel}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
