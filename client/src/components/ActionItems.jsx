export default function ActionItems({ actionItems }) {
  if (!actionItems?.length) return null;

  return (
    <section className="panel">
      <h2 className="panel__title">Action items</h2>
      <div className="action-table">
        <div className="action-table__row action-table__row--head">
          <span>Task</span>
          <span>Assignee</span>
          <span>Deadline</span>
        </div>
        {actionItems.map((item, i) => (
          <div className="action-table__row" key={i}>
            <span>{item.task}</span>
            <span className={item.assignee ? "" : "action-table__empty"}>
              {item.assignee || "Unassigned"}
            </span>
            <span className={item.deadline ? "mono" : "action-table__empty"}>
              {item.deadline || "Not specified"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
