import { createClient } from "@supabase/supabase-js";

let configPromise = null;
let supabaseClient = null;

export async function getAuthConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/auth/config")
      .then((response) => (response.ok ? response.json() : { authEnabled: false }))
      .catch(() => ({ authEnabled: false }));
  }
  return configPromise;
}

export async function getSupabaseClient() {
  const config = await getAuthConfig();
  if (!config.authEnabled || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabaseClient;
}

export async function getAccessToken() {
  const client = await getSupabaseClient();
  if (!client) {
    return "";
  }
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || "";
}

export async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
