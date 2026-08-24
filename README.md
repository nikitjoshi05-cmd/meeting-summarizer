# Meeting Summarizer

Upload a meeting recording and get a **timestamped transcript, summary, key decisions, action items, and open questions**.

```text
Audio → Whisper (ASR) → Transcript → Llama 3.3 (LLM) → Structured Results
```

## Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Frontend    | React + Vite, native `fetch`      |
| Backend     | Node.js + Express                 |
| ASR         | Whisper `whisper-large-v3-turbo`  |
| LLM         | Llama 3.3 70B                     |
| AI Provider | [Groq](https://console.groq.com/) |
| Database    | SQLite + `better-sqlite3`         |

Groq provides the API for both Whisper and Llama. The project uses the OpenAI-compatible API through the `openai` npm package.

---

## Architecture

```text
┌─────────────────┐
│  React + Vite   │
│    Frontend     │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Express REST API│
└──────┬─────┬────┘
       │     │
       │     └──────── HTTPS ──────┐
       │                           ▼
       │                    ┌──────────────┐
       │                    │  Groq Cloud  │
       │                    │              │
       │                    │ Whisper (ASR)│
       │                    │ Llama 3.3    │
       │                    └──────────────┘
       │
       │ SQL
       ▼
┌─────────────────┐
│ SQLite Database │
└─────────────────┘
```

### Backend

```text
server/src/
├── routes/        → API endpoints
├── controllers/   → Request orchestration
├── services/      → Whisper + Llama integrations
├── middleware/    → Upload + validation
└── database/      → SQLite schema + queries
```

### Frontend

```text
client/src/
├── pages/         → Home, Meeting
├── components/    → Upload, Status, Summary, Decisions,
│                    ActionItems, Transcript
└── services/      → API fetch wrappers
```

---

## Processing Pipeline

### 1. Upload

```text
POST /api/meetings
        ↓
Validate .mp3 / .wav / .m4a
        ↓
Validate ≤ 25 MB
        ↓
Create meeting ID
        ↓
Save status = uploaded
        ↓
Respond immediately
```

Processing continues asynchronously after the upload response.

### 2. Transcription

```text
status → transcribing
        ↓
Whisper via Groq
        ↓
Timestamped segments
        ↓
Formatted transcript
        ↓
Saved to SQLite
```

Example:

```text
[00:01] Rahul: We need to finish the frontend by Friday.
[00:15] Nikit: I'll handle the dashboard.
```

### 3. Summarization

```text
status → summarizing
        ↓
Transcript → Llama 3.3
        ↓
Structured JSON
        ↓
Summary / Key Points / Decisions /
Action Items / Open Questions
```

The prompt requires strict JSON and **does not allow invented assignees or deadlines**. Unknown values are returned as `null`.

### 4. Completion

```text
status → completed
        ↓
Delete temporary audio file
        ↓
Frontend displays results
```

The frontend polls `GET /api/meetings/:id` every **2 seconds** while processing.

If summarization fails after transcription succeeds, the transcript is retained.

---

## Project Structure

```text
meeting-summarizer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/api.js
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── database/
│   └── .env.example
│
├── demo/
└── README.md
```

---

## Setup

### Backend

```bash
cd server
npm install
cp .env.example .env
```

Add your Groq API key to `.env`:

```env
AI_API_KEY=gsk_...
```

Start the server:

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

The Vite development server proxies `/api/*` to the Express backend.

Get a Groq API key from [console.groq.com](https://console.groq.com/).

---

## API

### `POST /api/meetings`

Upload an audio file.

```json
{
  "meetingId": "abc123",
  "status": "uploaded"
}
```

Supported formats: `.mp3`, `.wav`, `.m4a`
Maximum size: **25 MB**

### `GET /api/meetings/:id`

Returns processing status and meeting results.

```json
{
  "id": "abc123",
  "status": "completed",
  "filename": "team_meeting.mp3",
  "transcript": "[00:01] Rahul: ...",
  "summary": "...",
  "keyPoints": ["..."],
  "decisions": ["..."],
  "actionItems": [
    {
      "task": "Complete dashboard",
      "assignee": "Nikit",
      "deadline": "Friday"
    }
  ],
  "openQuestions": ["..."]
}
```

### `GET /api/meetings`

Returns previous meetings, newest first.

---

## Design Decisions

* **Separate ASR and LLM services** — transcription and summarization are independently testable and replaceable.
* **Async processing + polling** — avoids queues and WebSockets while providing processing progress.
* **Structured LLM output** — predictable JSON makes results easy for the frontend to consume.
* **No hallucinated action items** — missing assignees/deadlines become `null`.
* **Stage-level errors** — transcription data is preserved even if summarization fails.
* **SQLite** — simple persistence without additional infrastructure.
* **Minimal architecture** — no authentication, microservices, real-time transcription, integrations, Docker, or cloud infrastructure.

---

## Cost

The project uses [Groq](https://console.groq.com/) instead of OpenAI by default.

Groq provides access to the selected Whisper and Llama models through an OpenAI-compatible API. Availability and free-tier limits may change over time.

---

## Demo

Place screenshots or a demo video in:

```text
demo/
```

Recommended demo:

```text
Upload → Transcribe → Summarize → View Results
```
