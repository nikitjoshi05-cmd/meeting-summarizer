export default function Decisions({ decisions, openQuestions }) {
  const hasDecisions = decisions?.length > 0;
  const hasQuestions = openQuestions?.length > 0;

  if (!hasDecisions && !hasQuestions) return null;

  return (
    <section className="panel">
      {hasDecisions && (
        <>
          <h2 className="panel__title">Key decisions</h2>
          <ul className="decision-list">
            {decisions.map((decision, i) => (
              <li key={i} className="decision-list__item">
                <span className="decision-list__check" aria-hidden="true">✓</span>
                {decision}
              </li>
            ))}
          </ul>
        </>
      )}

      {hasQuestions && (
        <>
          <h3 className="panel__subtitle">Open questions</h3>
          <ul className="bullet-list bullet-list--muted">
            {openQuestions.map((question, i) => (
              <li key={i}>{question}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
