import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".m4a"];

function isAcceptedFile(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function AudioUpload({ onSubmit, disabled }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);

  function chooseFile(file) {
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setLocalError("Unsupported file format. Please choose MP3, WAV or M4A.");
      setSelectedFile(null);
      return;
    }
    setLocalError(null);
    setSelectedFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    chooseFile(e.dataTransfer.files?.[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      setLocalError("Choose an audio file first.");
      return;
    }
    onSubmit(selectedFile);
  }

  return (
    <form className="upload-card" onSubmit={handleSubmit}>
      <div
        className={`upload-drop ${isDragging ? "upload-drop--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/*"
          hidden
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
        <span className="upload-drop__icon" aria-hidden="true">
          ▲
        </span>
        {selectedFile ? (
          <>
            <p className="upload-drop__filename">{selectedFile.name}</p>
            <p className="upload-drop__hint">Click to choose a different file</p>
          </>
        ) : (
          <>
            <p className="upload-drop__title">Drop meeting audio here</p>
            <p className="upload-drop__hint">or click to browse — MP3, WAV, M4A</p>
          </>
        )}
      </div>

      {localError && <p className="form-error">{localError}</p>}

      <button className="btn btn--primary" type="submit" disabled={disabled}>
        {disabled ? "Uploading…" : "Process meeting"}
      </button>
    </form>
  );
}
