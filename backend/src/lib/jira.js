import { env } from "../config/env.js";

function jiraConfigured() {
  return Boolean(env.jiraBaseUrl && env.jiraEmail && env.jiraApiToken);
}

function toAdfText(text) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text || "Created from CS Dashboard."
          }
        ]
      }
    ]
  };
}

function buildDescription(payload) {
  const lines = [
    "Created from CS Dashboard.",
    "",
    `Account: ${payload.account_name || "Not captured"}`,
    `Health: ${payload.health || "Not captured"}`,
    `Priority: ${payload.priority || "Not captured"}`,
    `Status: ${payload.current_status || "Not captured"}`,
    `Assignee in dashboard: ${payload.assignee_name || "Not captured"}`,
    `CSM: ${payload.csm || "Not captured"}`,
    `PM: ${payload.pm || "Not captured"}`,
    "",
    "Business impact:",
    payload.business_impact || "Not captured"
  ];

  return lines.join("\n");
}

export async function createPrdfJiraIssue(payload) {
  if (!jiraConfigured()) {
    const error = new Error(
      "Jira integration is not configured. Add JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN to .env."
    );
    error.status = 503;
    throw error;
  }

  const baseUrl = env.jiraBaseUrl.replace(/\/+$/, "");
  const auth = Buffer.from(`${env.jiraEmail}:${env.jiraApiToken}`).toString("base64");

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: {
        project: {
          key: env.jiraProjectKey
        },
        issuetype: {
          name: env.jiraIssueType
        },
        summary: payload.issue_title,
        description: toAdfText(buildDescription(payload)),
        labels: [env.jiraCreatedLabel]
      }
    })
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.errorMessages?.join(", ") ||
      (body?.errors ? JSON.stringify(body.errors) : `Jira create failed with ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}
