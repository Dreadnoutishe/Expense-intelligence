import { Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Transaction } from "../types";
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function TransactionTable({
  rows,
  edit,
  remove,
}: {
  rows: Transaction[];
  edit?: (t: Transaction) => void;
  remove?: (t: Transaction) => void;
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Category</th>
            <th>Date</th>
            <th className="text-right">Amount</th>
            {edit && (
              <th>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="transaction-name">
                  <span
                    className={`transaction-icon ${t.type === "income" ? "positive" : ""}`}
                  >
                    {t.type === "income" ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{t.description}</strong>
                    <small>{t.merchant || t.type}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className={`tag cat-${t.category}`}>{t.category}</span>
              </td>
              <td className="muted whitespace-nowrap">
                {new Date(`${t.date}T12:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td
                className={`text-right tabular-nums whitespace-nowrap ${t.type === "income" ? "positive" : ""}`}
              >
                {t.type === "income" ? "+" : "−"}
                {money(Math.round(Number(t.amount) * 100))}
              </td>
              {edit && (
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() => edit(t)}
                      aria-label={`Edit ${t.description}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn danger-text"
                      onClick={() => remove?.(t)}
                      aria-label={`Delete ${t.description}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      No transactions here yet. Add an entry or import a CSV to get started.
    </div>
  );
}
