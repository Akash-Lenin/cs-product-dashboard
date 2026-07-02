import { Router } from "express";
import { env } from "../config/env.js";
import { authEnabled, requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/config", (_req, res) => {
  res.json({
    authEnabled: authEnabled(),
    supabaseUrl: authEnabled() ? env.supabaseUrl : "",
    supabaseAnonKey: env.supabaseAnonKey || "",
    allowedDomain: env.authAllowedDomain || ""
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
