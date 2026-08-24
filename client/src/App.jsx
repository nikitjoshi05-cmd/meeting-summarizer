import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Meeting from "./pages/Meeting.jsx";

// Deliberately no react-router here — the app only has two screens, and a
// tiny hash listener keeps the dependency list to just react/react-dom.
function parseRoute(hash) {
  const match = hash.match(/^#\/meeting\/(.+)$/);
  if (match) return { name: "meeting", meetingId: match[1] };
  return { name: "home" };
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function goToMeeting(meetingId) {
    window.location.hash = `#/meeting/${meetingId}`;
  }

  function goHome() {
    window.location.hash = "#/";
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__mark" aria-hidden="true">
          <span className="app-header__led" />
        </div>
        <div>
          <h1 className="app-header__title">Meeting Summarizer</h1>
          <p className="app-header__subtitle">Audio in. Decisions and action items out.</p>
        </div>
      </header>

      <main className="app-main">
        {route.name === "meeting" ? (
          <Meeting meetingId={route.meetingId} onBack={goHome} />
        ) : (
          <Home onUploaded={goToMeeting} />
        )}
      </main>
    </div>
  );
}
