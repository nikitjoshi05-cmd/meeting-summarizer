const STEPS = [
  { key: "uploaded", label: "Upload", detail: "Audio received by the server" },
  { key: "transcribing", label: "Transcribe", detail: "Whisper is converting speech to text" },
  { key: "summarizing", label: "Summarize", detail: "The LLM is extracting decisions & actions" },
  { key: "completed", label: "Done", detail: "Results are ready" },
];

const STEP_LABEL = {
  uploaded: "Queued",
  transcribing: "Transcribing",
  summarizing: "Summarizing",
  completed: "Done",
  failed: "Failed",
};

function stepState(stepIndex, currentIndex, failed, failedAtIndex) {
  if (failed && stepIndex === failedAtIndex) return "failed";
  if (failed && stepIndex > failedAtIndex) return "pending";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

// Deterministic-looking bar heights so the waveform doesn't re-shuffle on
// every re-render, but still reads as an organic audio signal.
const BAR_HEIGHTS = [30, 55, 40, 80, 45, 65, 35, 50, 25, 60, 38, 70, 42, 58, 33, 48, 28, 62, 40, 52];

/**
 * Renders the pipeline like a cassette deck: spinning reels + a live
 * waveform while work is in progress, and a step readout underneath
 * tracking Upload -> Transcribe -> Summarize -> Done.
 */
export default function ProcessingStatus({ status, hasTranscript, errorMessage }) {
  const failed = status === "failed";
  const isRunning = !failed && status !== "completed";
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const failedAtIndex = failed ? (hasTranscript ? 2 : 1) : -1;

  return (
    <div className="tape-deck">
      <div className="tape-deck__reels" aria-hidden="true">
        <span className={`tape-reel ${isRunning ? "tape-reel--spinning" : ""}`} />
        <span className={`tape-reel ${isRunning ? "tape-reel--spinning" : ""}`} />
      </div>

      <div className="waveform" aria-hidden="true">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={`waveform__bar ${isRunning ? "waveform__bar--active" : ""}`}
            style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.08}s` }}
          />
        ))}
      </div>

      <p className="tape-deck__label">
        {failed ? "STOPPED" : STEP_LABEL[status]?.toUpperCase() || "PROCESSING"}
      </p>

      <div className="tape-deck__steps" role="list" aria-label="Processing pipeline">
        {STEPS.map((step, i) => {
          const state = stepState(
            i,
            currentIndex === -1 ? STEPS.length : currentIndex,
            failed,
            failedAtIndex
          );
          return (
            <div className={`tape-step tape-step--${state}`} role="listitem" key={step.key}>
              <span className="tape-step__dot" />
              <div className="tape-step__text">
                <p className="tape-step__label">{step.label}</p>
                <p className="tape-step__detail">
                  {state === "failed" ? errorMessage || "This step failed." : step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}