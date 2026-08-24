import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg", // .mp3
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4", // some browsers report .m4a as audio/mp4
]);

// 25MB matches Groq's free-tier ASR upload cap. Plenty for a
// short demo recording; compress longer meetings to MP3 first if needed.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = [".mp3", ".wav", ".m4a"].includes(ext);
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("UNSUPPORTED_FORMAT"));
  }
}

export const uploadAudio = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single("audio");

// Wraps multer so multer-specific errors (bad type, too large) come back
// as clean, predictable JSON instead of a stack trace.
export function handleUpload(req, res, next) {
  uploadAudio(req, res, (err) => {
    if (!err) return next();

    if (err.message === "UNSUPPORTED_FORMAT") {
      return res.status(400).json({
        error: "Unsupported file format. Please upload MP3, WAV or M4A.",
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File is too large. Maximum size is 25MB.",
      });
    }
    return res.status(400).json({ error: "Upload failed. Please try again." });
  });
}
