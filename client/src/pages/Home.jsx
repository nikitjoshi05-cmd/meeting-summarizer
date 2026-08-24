import { useEffect, useState } from "react";
import AudioUpload from "../components/AudioUpload.jsx";
import { uploadMeeting, listMeetings } from "../services/api.js";

const STATUS_LABEL = {
  uploaded: "Queued",
  transcribing: "Transcribing…",
  summarizing: "Summarizing…",
  completed: "Completed",
  failed: "Failed",
};

export default function Home({ onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  useEffect(() => {
    listMeetings()
      .then(setMeetings)
      .catch(() => {
        // A failed background fetch of past meetings shouldn't block the
        // upload flow — the list panel just stays empty.
      })
      .finally(() => setLoadingMeetings(false));
  }, []);

  async function handleSubmit(file) {
    setIsUploading(true);
    setError(null);
    try {
      const { meetingId } = await uploadMeeting(file);
      onUploaded(meetingId);
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  }

  return (
    <div className="home-grid">
      <div>
        <h2 className="section-heading">Upload your meeting audio</h2>
        <p className="section-subheading">
          We'll transcribe it and pull out the summary, decisions and action items.
        </p>
        <AudioUpload onSubmit={handleSubmit} disabled={isUploading} />
        {error && <p className="form-error">{error}</p>}
      </div>

      <div>
        <h2 className="section-heading">Previous meetings</h2>
        {loadingMeetings && <p className="section-subheading">Loading…</p>}
        {!loadingMeetings && meetings.length === 0 && (
          <p className="section-subheading">
            Nothing here yet — process your first meeting to see it appear.
          </p>
        )}
        <ul className="meeting-list">
          {meetings.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="meeting-list__item"
                onClick={() => onUploaded(m.id)}
              >
                <span className="meeting-list__filename">{m.filename}</span>
                <span className={`status-pill status-pill--${m.status}`}>
                  {STATUS_LABEL[m.status] || m.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
