import { useMemo, useState } from "react";
import { Search, Upload, Download } from "lucide-react";
import { TransactionTable } from "../components/TransactionTable";
import { categories, type Transaction } from "../types";
export function Transactions({
  rows,
  month,
  add,
  edit,
  remove,
  importCSV,
}: {
  rows: Transaction[];
  month: string;
  add: () => void;
  edit: (t: Transaction) => void;
  remove: (t: Transaction) => void;
  importCSV: () => void;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [start, setStart] = useState(month + "-01"),
    [end, setEnd] = useState(""),
    [sort, setSort] = useState("date_desc");
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (t) =>
            `${t.description} ${t.merchant}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!category || category === t.category) &&
            (!start || t.date >= start) &&
            (!end || t.date <= end),
        )
        .sort((a, b) => {
          const result = sort.startsWith("amount")
            ? Number(a.amount) - Number(b.amount)
            : a.date.localeCompare(b.date);
          return sort.endsWith("desc") ? -result : result;
        }),
    [rows, search, category, start, end, sort],
  );
  return (
    <>
      <div className="intro">
        <div>
          <span className="eyebrow">THE DETAILS THAT ADD UP</span>
          <h1>Transactions</h1>
          <p>A home for every expense and every bit of income.</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={importCSV}>
            <Upload size={16} /> Import CSV
          </button>
          <button className="primary" onClick={add}>
            + Add transaction
          </button>
        </div>
      </div>
      <section className="card">
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search transactions"
              placeholder="Search description or merchant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </label>
        </div>
        {start && end && start > end ? (
          <div className="error">The end date must follow the start date.</div>
        ) : (
          <TransactionTable rows={filtered} edit={edit} remove={remove} />
        )}
        <div className="card-foot">
          <span>{filtered.length} transactions · USD</span>
          <a className="text-btn" href="/sample.csv" download>
            <Download size={14} /> Sample CSV
          </a>
        </div>
      </section>
    </>
  );
}
