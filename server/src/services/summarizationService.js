import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const SUMMARY_MODEL = process.env.SUMMARY_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a professional meeting assistant. You read raw meeting
transcripts and produce a structured, factual summary for people who did not
attend the meeting.

Rules:
- Only use information that is explicitly present in the transcript.
- Do not invent, assume, or infer an assignee or deadline that was not stated.
  If a detail is missing, use null for that field.
- Keep the summary neutral and concise — no filler, no praise, no speculation.
- Action items must be concrete tasks, not general discussion topics.
- Respond with ONLY valid JSON matching the schema below. No markdown fences,
  no commentary before or after the JSON.

Schema:
{
  "summary": string,                 // 2-4 sentence overview of the meeting
  "keyPoints": string[],             // notable discussion points
  "decisions": string[],             // decisions that were explicitly made
  "actionItems": [
    {
      "task": string,
      "assignee": string | null,     // null if not stated in the transcript
      "deadline": string | null      // null if not stated in the transcript
    }
  ],
  "openQuestions": string[]          // unresolved questions raised in the meeting
}`;

/**
 * Sends a transcript to the LLM and returns a structured summary object.
 * @param {string} transcript
 * @returns {Promise<object>} parsed summary matching SYSTEM_PROMPT's schema
 */
export async function summarizeTranscript(transcript) {
  try {
    const response = await client.chat.completions.create({
      model: SUMMARY_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze the following meeting transcript and return the structured JSON result.\n\nTranscript:\n"""\n${transcript}\n"""`,
        },
      ],
    });

    const raw = response.choices[0].message.content;
    return normalizeSummary(JSON.parse(raw));
  } catch (err) {
    console.error("Summarization failed:", err.message);
    const error = new Error("LLM_FAILED");
    error.publicMessage =
      "Transcript generated successfully, but summary generation failed.";
    error.status = 502;
    throw error;
  }
}

// Defensive normalization in case the model omits a field or returns a
// slightly different shape than requested — keeps the frontend simple.
function normalizeSummary(data) {
  return {
    summary: data.summary || "",
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    actionItems: Array.isArray(data.actionItems)
      ? data.actionItems.map((item) => ({
          task: item.task || "",
          assignee: item.assignee ?? null,
          deadline: item.deadline ?? null,
        }))
      : [],
    openQuestions: Array.isArray(data.openQuestions) ? data.openQuestions : [],
  };
}
