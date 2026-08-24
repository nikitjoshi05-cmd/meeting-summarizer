const BASE_URL = "/api/meetings";

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data;
}

/**
 * Uploads an audio file and returns { meetingId, status }.
 * The backend processes ASR + summarization asynchronously.
 */
export async function uploadMeeting(file) {
  const formData = new FormData();
  formData.append("audio", file);

  const res = await fetch(BASE_URL, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

/** Fetches a single meeting's current status and results. */
export async function getMeeting(id) {
  const res = await fetch(`${BASE_URL}/${id}`);
  return handleResponse(res);
}

/** Fetches all previously processed meetings, most recent first. */
export async function listMeetings() {
  const res = await fetch(BASE_URL);
  return handleResponse(res);
}
