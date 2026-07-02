export function jiraHandoffState(issue) {
  const hasPrdf = Boolean(issue?.jira_ticket);
  const hasDev = Boolean(issue?.dev_jira_ticket);

  if (hasPrdf && hasDev) {
    return {
      key: "dev_linked",
      label: "Dev ticket linked",
      shortLabel: "Dev linked",
      background: "#DDF1E4",
      color: "#1F6B44"
    };
  }

  if (hasPrdf) {
    return {
      key: "prdf_created",
      label: "PRDF created, dev ticket pending",
      shortLabel: "PRDF created",
      background: "#FEEADC",
      color: "#8E5E48"
    };
  }

  if (hasDev) {
    return {
      key: "dev_only",
      label: "Dev ticket linked without a PRDF",
      shortLabel: "Dev, no PRDF",
      background: "#E9E4F6",
      color: "#4A3D8F"
    };
  }

  return {
    key: "no_prdf",
    label: "PRDF not created",
    shortLabel: "No PRDF",
    background: "#F3F1EC",
    color: "#57514A"
  };
}

export function jiraBrowseUrl(jiraBaseUrl, ticket) {
  if (!jiraBaseUrl || !ticket) {
    return "";
  }
  return `${String(jiraBaseUrl).replace(/\/+$/, "")}/browse/${ticket}`;
}
