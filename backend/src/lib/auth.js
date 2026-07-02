import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { supabase } from "./supabase.js";

let authClient = null;

export function authEnabled() {
  return Boolean(env.supabaseAnonKey);
}

function getAuthClient() {
  if (!authEnabled()) {
    return null;
  }
  if (!authClient) {
    authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return authClient;
}

function isMissingRelationError(error) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function resolveAppUser(email, fullName) {
  const { data, error } = await supabase
    .from("cs_app_users")
    .upsert(
      {
        email,
        full_name: fullName,
        last_seen_at: new Date().toISOString()
      },
      { onConflict: "email" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw httpError(
        503,
        "App users table is not created yet. Run the Supabase migration for cs_app_users first."
      );
    }
    throw error;
  }

  return data;
}

export async function requireAuth(req, _res, next) {
  try {
    const client = getAuthClient();

    // Auth is not configured yet: run in legacy open mode so local
    // development keeps working until SUPABASE_ANON_KEY is added.
    if (!client) {
      req.user = null;
      return next();
    }

    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      throw httpError(401, "Sign in required");
    }

    const { data, error } = await client.auth.getUser(token);

    if (error || !data?.user) {
      throw httpError(401, "Your session is invalid or expired. Sign in again.");
    }

    const email = String(data.user.email || "").toLowerCase();
    const metadata = data.user.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || email;

    if (!email) {
      throw httpError(403, "Your Google account did not return an email address.");
    }

    if (env.authAllowedDomain && !email.endsWith(`@${env.authAllowedDomain.toLowerCase()}`)) {
      throw httpError(403, `Only ${env.authAllowedDomain} accounts can use this app.`);
    }

    const appUser = await resolveAppUser(email, fullName);

    req.user = {
      email,
      name: appUser.full_name || fullName,
      role: appUser.role || env.authDefaultRole
    };

    // Audit: mutations are always attributed to the signed-in user.
    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      req.body.actor_name = req.user.name || req.user.email;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireEditorForWrites(req, _res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  // Legacy open mode (auth not configured).
  if (!authEnabled()) {
    return next();
  }

  if (req.user?.role === "editor") {
    return next();
  }

  return next(
    httpError(403, "Your account is read-only. Ask an editor to promote your role in cs_app_users.")
  );
}
