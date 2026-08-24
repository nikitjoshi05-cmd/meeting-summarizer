# AI Meeting Summarizer — Architecture & Supabase Migration Guide

## 1. System Architecture & Processing Pipeline

### Overview
The AI Meeting Summarizer is an asynchronous audio processing pipeline built with a **React (Vite)** frontend and an **Express.js** backend. It converts meeting audio files into structured summaries, key points, decisions, action items, and open questions using **Groq ASR (Whisper)** and **Groq LLMs (Llama 3.3)**.

```mermaid
flowchart TD
    subgraph Client ["Frontend (React / Vite)"]
        UI[User Interface]
        Poll[Polling Service /api/meetings/:id]
    end

    subgraph Backend ["Backend (Express.js API)"]
        API[POST /api/meetings]
        BG[Async Background Task]
        DB[(Database: SQLite / Supabase)]
    end

    subgraph External ["Groq Cloud AI"]
        ASR[Groq Speech-to-Text: Whisper]
        LLM[Groq LLM: Llama 3.3 70B]
    end

    UI -->|1. Upload Audio File| API
    API -->|2. Insert Record status=uploaded| DB
    API -->|3. Return 202 Accepted {meetingId}| UI
    UI -->|4. Poll status every 2s| Poll
    API -->|5. Start Background Pipeline| BG
    BG -->|6. Send Audio| ASR
    ASR -->|7. Return Transcript| BG
    BG -->|8. Send Transcript + Prompt| LLM
    LLM -->|9. Return Structured JSON| BG
    BG -->|10. Update Record status=completed| DB
    Poll -->|11. Fetch Final Result| DB
```

### End-to-End Processing Steps
1. **Upload Phase**: Frontend sends audio (`multipart/form-data`) to `POST /api/meetings`.
2. **Immediate Response**: Server saves audio, creates a database record with `status: 'uploaded'`, and returns `HTTP 202 Accepted` with `meetingId`.
3. **Transcription Phase (ASR)**: Server updates status to `'transcribing'` and sends the audio stream to Groq's `whisper-large-v3-turbo` API to generate the raw text transcript.
4. **Summarization Phase (LLM)**: Server updates status to `'summarizing'` and passes the transcript to `llama-3.3-70b-versatile` with `response_format: { type: "json_object" }` to extract structured meeting insights (Summary, Key Points, Decisions, Action Items, Open Questions).
5. **Completion / Error Handling**: Server stores output into the database and updates status to `'completed'` (or `'failed'`). Temp audio file is unlinked.

---

## 2. Deploying on Vercel: Can You Use a Local DB?

> [!WARNING]
> **No, you cannot deploy SQLite (`better-sqlite3`) directly on Vercel.**

### Why SQLite Fails on Vercel Serverless:
1. **Ephemeral Filesystem**: Vercel Serverless Functions execute in isolated container environments. The disk is read-only (except `/tmp`), and any files saved to disk disappear when the serverless function finishes executing.
2. **Native C++ Dependencies**: `better-sqlite3` relies on compiled native C++ bindings which can cause build/runtime failures inside Vercel's Node.js lambda environment.
3. **No Stateful Connections**: Serverless functions scale horizontally across multiple instances. SQLite relies on a single shared file lock, which does not scale across instances.

### The Solution: Vercel + Supabase
Pairing **Vercel** (for hosting your React client & Express/Serverless API) with **Supabase** (for hosted PostgreSQL database and file storage) is the standard, production-ready architecture.

---

## 3. How to Switch from SQLite to Supabase

### Step 1: Create a Supabase Project
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, grab your:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)

### Step 2: Create the `meetings` Table in Supabase
Open the **SQL Editor** in your Supabase Dashboard and run:

```sql
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  decisions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  open_questions JSONB DEFAULT '[]'::jsonb
);
```

### Step 3: Install `@supabase/supabase-js` in your Backend
Run in `server/`:
```bash
npm install @supabase/supabase-js
npm uninstall better-sqlite3
```

### Step 4: Update Database Client (`server/src/database/database.js`)
Replace the SQLite code with Supabase client:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function createMeeting({ id, filename }) {
  const { data, error } = await supabase
    .from("meetings")
    .insert([{ id, filename, status: "uploaded" }])
    .select()
    .single();

  if (error) throw error;
  return parseJsonFields(data);
}

export async function updateMeetingStatus(id, status, extra = {}) {
  const payload = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  const { data, error } = await supabase
    .from("meetings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) console.error("Supabase update error:", error);
  return parseJsonFields(data);
}

export async function getMeeting(id) {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return parseJsonFields(data);
}

export async function listMeetings() {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data.map(parseJsonFields);
}

function parseJsonFields(row) {
  if (!row) return row;
  return {
    ...row,
    keyPoints: row.key_points || [],
    decisions: row.decisions || [],
    actionItems: row.action_items || [],
    openQuestions: row.open_questions || [],
  };
}
```

### Step 5: Configure `vercel.json` for Serverless Deployment
Add `vercel.json` to the root directory to deploy both Express API and Vite React App on Vercel:

```json
{
  "version": 2,
  "builds": [
    { "src": "server/src/app.js", "use": "@vercel/node" },
    { "src": "client/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server/src/app.js" },
    { "src": "/(.*)", "dest": "client/$1" }
  ]
}
```

### Step 6: Environment Variables on Vercel
In the Vercel Dashboard project settings, set:
- `GROQ_API_KEY`: Your Groq API key
- `SUPABASE_URL`: `https://<your-project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
