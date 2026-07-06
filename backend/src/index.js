import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import issuesRouter from "./routes/issues.js";
import meetingsRouter from "./routes/meetings.js";
import { authEnabled, enforceProductionAuth, requireAuth, requireEditorForWrites } from "./lib/auth.js";
import { env } from "./config/env.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/issues", enforceProductionAuth, requireAuth, requireEditorForWrites, issuesRouter);
app.use("/api/meetings", enforceProductionAuth, requireAuth, requireEditorForWrites, meetingsRouter);

app.use(express.static(frontendDist));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(frontendDist, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: {
      message: error.message || "Unexpected server error"
    }
  });
});

app.listen(env.port, () => {
  console.log(`CS dashboard backend listening on port ${env.port}`);
  if (!authEnabled()) {
    if (env.nodeEnv === "production") {
      console.error(
        "WARNING: auth is NOT configured (SUPABASE_ANON_KEY missing). Production fails closed: data routes return 503 until it is set."
      );
    } else {
      console.warn("Auth not configured; running in open mode (development only).");
    }
  }
});

