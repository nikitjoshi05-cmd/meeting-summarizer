import fs from "fs";
import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const ASR_MODEL = process.env.ASR_MODEL || "whisper-large-v3-turbo";

/**
 * Sends an audio file to the ASR provider and returns a transcript.
 * Uses verbose_json so we get back segment-level timestamps, which we
 * fold into a lightly formatted "[mm:ss] text" transcript the LLM
 * (and the UI) can both read cleanly.
 *
 * @param {string} filePath - absolute path to the audio file on disk
 * @returns {Promise<{ text: string, segments: Array }>}
 */
export async function transcribeAudio(filePath) {
  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: ASR_MODEL,
      response_format: "verbose_json",
    });

    const segments = response.segments || [];
    const formatted = segments.length
      ? segments.map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text.trim()}`).join("\n")
      : response.text;

    return {
      text: formatted,
      raw: response.text,
      segments,
    };
  } catch (err) {
    console.error("Transcription failed:", err.message);
    const error = new Error("ASR_FAILED");
    error.publicMessage = "Transcription failed. Please try again.";
    error.status = 502;
    throw error;
  }
}

function formatTimestamp(totalSeconds = 0) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
