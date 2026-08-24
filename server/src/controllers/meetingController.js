import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import {
  createMeeting,
  updateMeetingStatus,
  getMeeting,
  listMeetings,
} from "../database/database.js";
import { transcribeAudio } from "../services/transcriptionService.js";
import { summarizeTranscript } from "../services/summarizationService.js";

// POST /api/meetings  (multipart/form-data, field name "audio")
export async function uploadMeeting(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file was provided." });
  }

  try {
    const meetingId = uuidv4();
    const meeting = await createMeeting({
      id: meetingId,
      filename: req.file.originalname,
    });

    // Respond immediately with "processing" and do the ASR/LLM work in the
    // background. The frontend polls GET /api/meetings/:id for progress.
    res.status(202).json({ meetingId: meeting.id, status: meeting.status });

    processMeeting(meetingId, req.file.path).catch((err) => {
      console.error(`Processing failed for meeting ${meetingId}:`, err);
    });
  } catch (err) {
    next(err);
  }
}

async function processMeeting(meetingId, audioPath) {
  try {
    await updateMeetingStatus(meetingId, "transcribing");
    const { text: transcript } = await transcribeAudio(audioPath);
    await updateMeetingStatus(meetingId, "summarizing", { transcript });

    const result = await summarizeTranscript(transcript);

    await updateMeetingStatus(meetingId, "completed", {
      summary: result.summary,
      key_points: result.keyPoints,
      decisions: result.decisions,
      action_items: result.actionItems,
      open_questions: result.openQuestions,
    });
  } catch (err) {
    await updateMeetingStatus(meetingId, "failed", {
      error: err.publicMessage || err.message || "Processing failed. Please try again.",
    });
  } finally {
    // Clean up the temporary audio file regardless of outcome.
    fs.unlink(audioPath, () => {});
  }
}

// GET /api/meetings/:id
export async function getMeetingById(req, res, next) {
  try {
    const meeting = await getMeeting(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }
    res.json(meeting);
  } catch (err) {
    next(err);
  }
}

// GET /api/meetings
export async function getAllMeetings(_req, res, next) {
  try {
    const meetings = await listMeetings();
    res.json(meetings);
  } catch (err) {
    next(err);
  }
}

