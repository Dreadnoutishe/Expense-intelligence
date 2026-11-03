import { Target, ArrowUpRight, Pencil, Leaf } from "lucide-react";
import type { Budget } from "../types";
import { money } from "../components/TransactionTable";
export function Budgets({
  rows,
  add,
  edit,
}: {
  rows: Budget[];
  add: () => void;
  edit: (b: Budget) => void;
}) {
  return (
    <>
      <div className="intro">
        <div>
          <span className="eyebrow">A PLAN WITH ROOM TO LIVE</span>
          <h1>Budgets & goals</h1>
          <p>Give your spending a little direction, one category at a time.</p>
        </div>
        <button className="primary" onClick={add}>
          + Create budget
        </button>
      </div>
      <div className="budget-grid">
        {rows.map((b) => (
          <section key={b.id} className="card budget-card">
            <div className="section-head">
              <span className="category-heading">
                <Target size={20} />
                <h2>{b.category}</h2>
              </span>
              <button
                className="icon-btn"
                aria-label={`Edit ${b.category} budget`}
                onClick={() => edit(b)}
              >
                <Pencil size={16} />
              </button>
            </div>
            <div className="budget-amount">
              <strong>{money(b.spent_cents)}</strong>
              <span> / {money(b.amount_cents)}</span>
            </div>
            <div
              className={`progress-track ${b.utilization >= 100 ? "over" : b.utilization >= 80 ? "near" : ""}`}
            >
              <div style={{ width: `${Math.min(b.utilization, 100)}%` }} />
            </div>
            <div className="budget-status">
              <span>{b.utilization.toFixed(1)}% used</span>
              <span
                className={
                  b.remaining_cents < 0
                    ? "danger-text"
                    : b.utilization >= 80
                      ? "warning"
                      : "positive"
                }
              >
                {b.remaining_cents < 0
                  ? `${money(-b.remaining_cents)} over limit`
                  : `${money(b.remaining_cents)} left`}
              </span>
            </div>
            <p className="budget-hint">
              {b.utilization > 100
                ? "Over budget. Consider adjusting your plan."
                : b.utilization >= 80
                  ? "Approaching your limit. Time for a quick check-in."
                  : "You have room in this category."}
            </p>
          </section>
        ))}
      </div>
      {!rows.length && (
        <div className="card empty">
          No budgets for this month. Create a category limit to see your
          progress.
        </div>
      )}
      <section className="card challenge">
        <Leaf size={30} />
        <div>
          <span className="eyebrow">A SIMPLE SAVINGS CHALLENGE</span>
          <h2>Keep a little breathing room.</h2>
          <p>
            Choose one category and aim to leave 10% of its budget unspent this
            month.
          </p>
          {rows.length > 0 && (
            <small>
              {rows.filter((b) => b.utilization <= 90).length} of {rows.length}{" "}
              category budgets currently have at least 10% remaining.
            </small>
          )}
        </div>
        <button className="secondary" onClick={add}>
          Plan a category <ArrowUpRight size={16} />
        </button>
      </section>
    </>
  );
}
