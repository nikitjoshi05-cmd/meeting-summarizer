export default function Summary({ summary, keyPoints }) {
  return (
    <section className="panel">
      <h2 className="panel__title">Summary</h2>
      <p className="panel__body">{summary || "No summary was generated."}</p>

      {keyPoints?.length > 0 && (
        <>
          <h3 className="panel__subtitle">Key discussion points</h3>
          <ul className="bullet-list">
            {keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
