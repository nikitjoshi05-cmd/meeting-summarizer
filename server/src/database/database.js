import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function initDatabase() {
  if (!supabase) {
    console.warn(
      "⚠️ Warning: SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not set in environment variables."
    );
  }
}

export async function createMeeting({ id, filename }) {
  if (!supabase) throw new Error("Supabase client is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env");
  const { data, error } = await supabase
    .from("meetings")
    .insert([{ id, filename, status: "uploaded" }])
    .select()
    .single();

  if (error) throw error;
  return parseJsonFields(data);
}

export async function updateMeetingStatus(id, status, extra = {}) {
  if (!supabase) throw new Error("Supabase client is not configured.");
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

  if (error) {
    console.error("Supabase update error:", error);
    throw error;
  }
  return parseJsonFields(data);
}

export async function getMeeting(id) {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return parseJsonFields(data);
}

export async function listMeetings() {
  if (!supabase) throw new Error("Supabase client is not configured.");
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
    keyPoints: Array.isArray(row.key_points)
      ? row.key_points
      : typeof row.key_points === "string"
      ? JSON.parse(row.key_points || "[]")
      : row.keyPoints || [],
    decisions: Array.isArray(row.decisions)
      ? row.decisions
      : typeof row.decisions === "string"
      ? JSON.parse(row.decisions || "[]")
      : row.decisions || [],
    actionItems: Array.isArray(row.action_items)
      ? row.action_items
      : typeof row.action_items === "string"
      ? JSON.parse(row.action_items || "[]")
      : row.actionItems || [],
    openQuestions: Array.isArray(row.open_questions)
      ? row.open_questions
      : typeof row.open_questions === "string"
      ? JSON.parse(row.open_questions || "[]")
      : row.openQuestions || [],
  };
}

export default supabase;

