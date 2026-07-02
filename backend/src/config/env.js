import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(projectRoot, ".env") });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  authAllowedDomain: process.env.AUTH_ALLOWED_DOMAIN || "everstage.com",
  authDefaultRole: process.env.AUTH_DEFAULT_ROLE || "reviewer",
  jiraBaseUrl: process.env.JIRA_BASE_URL || "",
  jiraEmail: process.env.JIRA_EMAIL || "",
  jiraApiToken: process.env.JIRA_API_TOKEN || "",
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || "PRDF",
  jiraIssueType: process.env.JIRA_ISSUE_TYPE || "Task",
  jiraCreatedLabel: process.env.JIRA_CREATED_LABEL || "cs-db-created",
  jiraPrdfCreateUrl: process.env.JIRA_PRDF_CREATE_URL || ""
};
