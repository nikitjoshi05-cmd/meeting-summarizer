# Meeting Summarizer

Upload a meeting recording and get back a transcript, a summary, key
decisions, and a structured action-item list (task / assignee / deadline) —
powered by a Groq Whisper ASR step feeding a separate LLM summarization
step.

```
Audio → ASR (Whisper) → Transcript → LLM (structured JSON) → Summary / Decisions / Action Items
```

## Stack

| Layer     | Choice                                                   |
|-----------|-----------------------------------------------------------|
| Frontend  | React + Vite, native `fetch` (no Axios)                   |
| Backend   | Node.js + Express (REST API)                               |
| ASR       | Whisper, via [Groq's free API](https://console.groq.com) |
| LLM       | Llama 3.3 70B, via [Groq's free API](https://console.groq.com) |
| Database  | SQLite via `better-sqlite3`                                 |

No queues, sockets, auth, or microservices — kept intentionally minimal.

### A note on cost

This project uses **[Groq](https://console.groq.com)** for both transcription
and summarization. Groq provides a free tier with rate limits and does not
require a credit card for this demo.

## Project structure

```
meeting-summarizer/
├── client/                    React + Vite frontend
│   └── src/
│       ├── components/        AudioUpload, ProcessingStatus, Summary,
│       │                      Decisions, ActionItems, Transcript
│       ├── pages/              Home.jsx, Meeting.jsx
│       └── services/api.js     fetch wrappers for the REST API
│
├── server/                    Express backend
│   └── src/
│       ├── routes/             meetingRoutes.js
│       ├── controllers/        meetingController.js
│       ├── services/           transcriptionService.js, summarizationService.js
│       ├── middleware/         uploadMiddleware.js (multer + validation)
│       └── database/           database.js (SQLite schema + queries)
│
└── demo/                      Drop your demo video/screenshots here
```

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Then get a free key:
1. Go to [console.groq.com](https://console.groq.com) and sign up (no credit card).
2. Create an API key.
3. Paste it into `.env` as `GROQ_API_KEY=gsk_...`.

```bash
npm run dev                # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:4000`
(see `client/vite.config.js`), so the two just work together with no CORS
configuration needed in development.

Open `http://localhost:5173`, upload an MP3/WAV/M4A file, and watch the
pipeline move through Transcribe → Summarize → Done.

## API

### `POST /api/meetings`
Multipart upload, field name `audio`. Returns immediately and processes in
the background.

```json
{ "meetingId": "abc123", "status": "uploaded" }
```

### `GET /api/meetings/:id`
Poll this while status is `uploaded` / `transcribing` / `summarizing`.

```json
{
  "id": "abc123",
  "status": "completed",
  "filename": "team_meeting.mp3",
  "transcript": "[00:01] Rahul: We need to finish the frontend by Friday.\n...",
  "summary": "...",
  "keyPoints": ["..."],
  "decisions": ["..."],
  "actionItems": [
    { "task": "Complete dashboard", "assignee": "Nikit", "deadline": "Friday" }
  ],
  "openQuestions": ["Which database will be used?"]
}
```

### `GET /api/meetings`
List all meetings, most recent first (for the "previous meetings" panel).

## Design notes

- **ASR and LLM are separate services** (`transcriptionService.js`,
  `summarizationService.js`) called in sequence by the controller — speech
  recognition and language understanding are different problems and are kept
  independently testable/replaceable.
- **The summarization prompt is structured and constrained**: it asks for
  JSON matching an explicit schema and explicitly forbids inventing an
  assignee or deadline that wasn't stated (`null` instead of guessing).
- **Processing is async but polled**, not real-time — the upload responds
  immediately with a meeting ID and status, and the frontend polls
  `GET /api/meetings/:id` every 2 seconds until it reaches a terminal state.
  This avoids WebSockets while still giving live progress feedback.
- **Errors are surfaced per stage**: an ASR failure and an LLM failure return
  different messages, and a transcript that finished successfully is kept
  even if summarization fails afterward.

## What's intentionally not here

Auth, real-time transcription, speaker diarization, calendar/Slack/email
integrations, a mobile app, and Docker/cloud infra — none of those affect
ASR accuracy, summary quality, prompt design, or code structure, so they're
left out to keep the project small and finishable.
