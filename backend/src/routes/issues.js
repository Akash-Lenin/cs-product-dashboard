import { Router } from "express";
import {
  getDashboardIssues,
  getDashboardSummary,
  getFilterOptions
} from "../lib/dashboard-data.js";

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

export default router;

