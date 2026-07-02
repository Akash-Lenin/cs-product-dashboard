import { Router } from "express";
import {
  createDashboardIssue,
  createPrdfForExistingIssue,
  createTrackerIssue,
  deleteDashboardIssue,
  createIssueUpdate,
  getDashboardIssues,
  getDeletedIssues,
  getDashboardSummary,
  getFilterOptions,
  getIssueUpdates,
  permanentlyDeleteArchivedIssue,
  restoreDeletedIssue,
  updateDashboardIssue
} from "../lib/dashboard-data.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const issues = await getDashboardIssues({
      csm: req.query.csm,
      pm: req.query.pm,
      health: req.query.health,
      priority: req.query.priority,
      currentStatus: req.query.currentStatus,
      search: req.query.search
    });

    res.json({ issues });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const issue = await createDashboardIssue(req.body || {});
    res.status(201).json({ issue });
  } catch (error) {
    next(error);
  }
});

router.post("/tracker", async (req, res, next) => {
  try {
    const issue = await createTrackerIssue(req.body || {});
    res.status(201).json({ issue });
  } catch (error) {
    next(error);
  }
});

router.get("/meta/filters", async (_req, res, next) => {
  try {
    const filters = await getFilterOptions();
    res.json(filters);
  } catch (error) {
    next(error);
  }
});

router.get("/meta/summary", async (_req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.get("/meta/config", (_req, res) => {
  res.json({
    jiraBaseUrl: env.jiraBaseUrl || "",
    jiraPrdfCreateUrl: env.jiraPrdfCreateUrl || "",
    jiraProjectKey: env.jiraProjectKey || ""
  });
});

router.get("/deleted", async (_req, res, next) => {
  try {
    const issues = await getDeletedIssues();
    res.json({ issues });
  } catch (error) {
    next(error);
  }
});

router.post("/deleted/:deletedId/restore", async (req, res, next) => {
  try {
    const issue = await restoreDeletedIssue(req.params.deletedId, req.body || {});
    res.json({ issue });
  } catch (error) {
    next(error);
  }
});

router.delete("/deleted/:deletedId", async (req, res, next) => {
  try {
    await permanentlyDeleteArchivedIssue(req.params.deletedId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/:issueImportKey", async (req, res, next) => {
  try {
    const issue = await updateDashboardIssue(req.params.issueImportKey, req.body || {});
    res.json({ issue });
  } catch (error) {
    next(error);
  }
});

router.delete("/:issueImportKey", async (req, res, next) => {
  try {
    const deletedIssue = await deleteDashboardIssue(req.params.issueImportKey, req.body || {});
    res.json({ deletedIssue });
  } catch (error) {
    next(error);
  }
});

router.post("/:issueImportKey/create-prdf", async (req, res, next) => {
  try {
    const issue = await createPrdfForExistingIssue(req.params.issueImportKey, req.body || {});
    res.status(201).json({ issue });
  } catch (error) {
    next(error);
  }
});

router.get("/:issueImportKey/updates", async (req, res, next) => {
  try {
    const payload = await getIssueUpdates(req.params.issueImportKey);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/:issueImportKey/updates", async (req, res, next) => {
  try {
    const update = await createIssueUpdate(req.params.issueImportKey, req.body || {});
    res.status(201).json({ update });
  } catch (error) {
    next(error);
  }
});

export default router;
