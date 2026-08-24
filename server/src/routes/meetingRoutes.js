import { Router } from "express";
import { handleUpload } from "../middleware/uploadMiddleware.js";
import {
  uploadMeeting,
  getMeetingById,
  getAllMeetings,
} from "../controllers/meetingController.js";

const router = Router();

router.post("/", handleUpload, uploadMeeting);
router.get("/", getAllMeetings);
router.get("/:id", getMeetingById);

export default router;
