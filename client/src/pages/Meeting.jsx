import { useEffect, useRef, useState } from "react";
import { getMeeting } from "../services/api.js";
import ProcessingStatus from "../components/ProcessingStatus.jsx";
import Summary from "../components/Summary.jsx";
import Decisions from "../components/Decisions.jsx";
import ActionItems from "../components/ActionItems.jsx";
import Transcript from "../components/Transcript.jsx";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

export default function Meeting({ meetingId, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getMeeting(meetingId);
        if (cancelled) return;
        setMeeting(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          clearInterval(pollRef.current);
        }
      }
    }

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [meetingId]);

  return (
    <div>
      <button type="button" className="btn btn--ghost back-link" onClick={onBack}>
        ← Back to meetings
      </button>

      {error && <p className="form-error">{error}</p>}

      {!meeting && !error && <p className="section-subheading">Loading meeting…</p>}

      {meeting && (
        <>
          <h2 className="section-heading">{meeting.filename}</h2>

          {meeting.status !== "completed" && (
            <ProcessingStatus
              status={meeting.status}
              hasTranscript={Boolean(meeting.transcript)}
              errorMessage={meeting.error}
            />
          )}

          {meeting.status === "completed" && (
            <div className="results-grid">
              <div className="panel--wide">
                <Summary summary={meeting.summary} keyPoints={meeting.keyPoints} />
              </div>
              <Decisions decisions={meeting.decisions} openQuestions={meeting.openQuestions} />
              <ActionItems actionItems={meeting.actionItems} />
              <div className="panel--wide">
                <Transcript transcript={meeting.transcript} />
              </div>
            </div>
          )}

          {meeting.status === "failed" && meeting.transcript && (
            <div className="results-grid">
              <Transcript transcript={meeting.transcript} />
            </div>
          )}
        </>
      )}
    </div>
  );
}