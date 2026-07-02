import { Router } from "express";
import {
  createActionItem,
  createMeeting,
  createMeetingNote,
  getMeetings,
  updateActionItem,
  updateMeeting
} from "../lib/meeting-data.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const meetings = await getMeetings();
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const meeting = await createMeeting(req.body || {});
    res.status(201).json({ meeting });
  } catch (error) {
    next(error);
  }
});

router.patch("/actions/:actionId", async (req, res, next) => {
  try {
    const actionItem = await updateActionItem(req.params.actionId, req.body || {});
    res.json({ actionItem });
  } catch (error) {
    next(error);
  }
});

router.patch("/:meetingId", async (req, res, next) => {
  try {
    const meeting = await updateMeeting(req.params.meetingId, req.body || {});
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
});

router.post("/:meetingId/notes", async (req, res, next) => {
  try {
    const note = await createMeetingNote(req.params.meetingId, req.body || {});
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

router.post("/:meetingId/actions", async (req, res, next) => {
  try {
    const actionItem = await createActionItem(req.params.meetingId, req.body || {});
    res.status(201).json({ actionItem });
  } catch (error) {
    next(error);
  }
});

export default router;
