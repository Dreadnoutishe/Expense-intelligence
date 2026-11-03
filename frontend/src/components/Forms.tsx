import { useState, type FormEvent } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../services/api";
import {
  categories,
  type Transaction,
  type Budget,
  type ImportPreview,
} from "../types";
type Common = { close: () => void; done: (message: string) => Promise<void> };
export function TransactionForm({
  transaction,
  month,
  close,
  done,
}: { transaction?: Transaction; month: string } & Common) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/transactions${transaction ? "/" + transaction.id : ""}`, {
        method: transaction ? "PUT" : "POST",
        body: JSON.stringify({ ...data, category: data.category || null }),
      });
      await done(transaction ? "Transaction updated" : "Transaction added");
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={transaction ? "Edit transaction" : "Add transaction"}
      onClose={close}
    >
      <form onSubmit={submit} className="form">
        <div className="form-grid">
          <label>
            Amount (USD)
            <input
              autoFocus
              name="amount"
              type="number"
              min="0.01"
              max="9999999999.99"
              step="0.01"
              required
              placeholder="0.00"
              defaultValue={transaction?.amount}
            />
          </label>
          <label>
            Type
            <select name="type" defaultValue={transaction?.type || "expense"}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>
        <label>
          Description
          <input
            name="description"
            maxLength={200}
            required
            placeholder="e.g. Weekly groceries"
            defaultValue={transaction?.description}
          />
        </label>
        <label>
          Merchant <span className="muted">(optional)</span>
          <input
            name="merchant"
            maxLength={120}
            placeholder="e.g. Green Market"
            defaultValue={transaction?.merchant}
          />
        </label>
        <div className="form-grid">
          <label>
            Date
            <input
              name="date"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              required
              defaultValue={
                transaction?.date ||
                (new Date().toLocaleDateString("en-CA").startsWith(month)
                  ? new Date().toLocaleDateString("en-CA")
                  : month + "-01")
              }
            />
          </label>
          <label>
            Category
            <select name="category" defaultValue={transaction?.category || ""}>
              <option value="">Auto-detect from rules</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="helper">
          Categories use local keyword rules. Your selection always takes
          priority.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function BudgetForm({
  budget,
  month,
  close,
  done,
}: { budget?: Budget; month: string } & Common) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/budgets${budget ? "/" + budget.id : ""}`, {
        method: budget ? "PUT" : "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      await done("Budget saved");
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={budget ? "Edit budget" : "Create a category budget"}
      onClose={close}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Month
          <input
            name="month"
            type="month"
            required
            defaultValue={budget?.month || month}
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={budget?.category || "Food"}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Monthly limit (USD)
          <input
            autoFocus
            name="amount"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            required
            defaultValue={budget ? budget.amount_cents / 100 : undefined}
            placeholder="300.00"
          />
        </label>
        <p className="helper">
          Only expenses count toward the category limit. At 80%, you’ll see a
          gentle reminder.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ImportForm({ close, done }: Common) {
  const [preview, setPreview] = useState<ImportPreview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      imported: number;
      skipped: number;
      rejected: number;
    } | null>(null);
  async function upload(file: File) {
    setBusy(true);
    setError("");
    setPreview(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      setPreview(
        await api<ImportPreview>("/transactions/import/preview", {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        imported: number;
        skipped: number;
        rejected: number;
      }>("/transactions/import/confirm", {
        method: "POST",
        body: JSON.stringify({ csv: preview!.csv }),
      });
      setResult(result);
      await done(`${result.imported} transactions imported`);
      setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Import transactions" onClose={close}>
      <p className="helper">
        Upload UTF-8 CSV. Required: date, description, amount, type. Optional:
        merchant, category. Dates use YYYY-MM-DD; amounts are positive USD with
        up to two decimals.
      </p>
      <label className="upload-area">
        <Upload size={28} />
        <strong>Choose a CSV file</strong>
        <span>Up to 2 MB · 5,000 rows</span>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      <a className="text-btn" href="/sample.csv" download>
        Download sample CSV
      </a>
      {busy && <p role="status">Processing…</p>}
      {error && (
        <p className="error" role="alert">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      {result && (
        <div className="import-result" role="status">
          <h3>Import complete</h3>
          <p>
            {result.imported} imported · {result.skipped} duplicates skipped ·{" "}
            {result.rejected} invalid rows rejected.
          </p>
          <button className="primary" onClick={close}>
            Done
          </button>
        </div>
      )}
      {preview && (
        <>
          <div className="preview-summary">
            {["valid", "duplicate", "invalid"].map((status) => (
              <span key={status} className={`tag status-${status}`}>
                {preview.rows.filter((r) => r.status === status).length}{" "}
                {status}
              </span>
            ))}
          </div>
          <div className="preview-table table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Description</th>
                  <th>Status / details</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.data.description || "—"}</td>
                    <td>
                      <span className={`tag status-${r.status}`}>
                        {r.status}
                      </span>
                      {r.error && <small>{r.error}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="helper">
            Only valid, nonduplicate rows will be imported. Duplicates are
            rechecked when you confirm.
          </p>
          <div className="form-actions">
            <button className="secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy || !preview.rows.some((r) => r.status === "valid")}
              onClick={() => void confirm()}
            >
              Confirm import
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
