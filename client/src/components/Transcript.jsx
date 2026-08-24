import { useState } from "react";

export default function Transcript({ transcript }) {
  const [copied, setCopied] = useState(false);

  if (!transcript) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions can fail silently in some browsers/contexts —
      // not worth surfacing an error for a "nice to have" convenience action.
    }
  }

  return (
    <section className="panel">
      <div className="panel__header-row">
        <h2 className="panel__title">Transcript</h2>
        <button type="button" className="btn btn--ghost" onClick={handleCopy}>
          {copied ? "Copied" : "Copy transcript"}
        </button>
      </div>
      <pre className="transcript mono">{transcript}</pre>
    </section>
  );
}
