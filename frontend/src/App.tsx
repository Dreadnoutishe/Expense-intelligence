import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Trophy,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { useFinance } from "./hooks/useFinance";
import { Overview } from "./pages/Overview";
import { Transactions } from "./pages/Transactions";
import { Budgets } from "./pages/Budgets";
import { Achievements } from "./pages/Achievements";
import { TransactionForm, BudgetForm, ImportForm } from "./components/Forms";
import { Modal } from "./components/Modal";
import { api } from "./services/api";
import type { Transaction, Budget } from "./types";
const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Transactions", icon: ArrowLeftRight },
  { name: "Budgets & goals", icon: Target },
  { name: "Achievements", icon: Trophy },
];
export default function App() {
  const [page, setPage] = useState("Overview"),
    [month, setMonth] = useState(() =>
      new Date().toLocaleDateString("en-CA").slice(0, 7),
    ),
    [menu, setMenu] = useState(false);
  const { data, loading, error, reload } = useFinance(month);
  const [form, setForm] = useState<"transaction" | "budget" | "import" | null>(
      null,
    ),
    [transaction, setTransaction] = useState<Transaction>(),
    [budget, setBudget] = useState<Budget>(),
    [deleting, setDeleting] = useState<Transaction | null>(null),
    [deleteError, setDeleteError] = useState(""),
    [deleteBusy, setDeleteBusy] = useState(false),
    [toast, setToast] = useState("");
  const previousXP = useRef<number | null>(null);
  useEffect(() => {
    if (data) {
      if (previousXP.current !== null && data.progress.xp > previousXP.current)
        setToast(
          `Achievement unlocked! +${data.progress.xp - previousXP.current} XP`,
        );
      previousXP.current = data.progress.xp;
    }
  }, [data]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function navigate(value: string) {
    setPage(value);
    setMenu(false);
  }
  function add() {
    setTransaction(undefined);
    setForm("transaction");
  }
  function addBudget() {
    setBudget(undefined);
    setForm("budget");
  }
  async function done(message: string) {
    setToast(message);
    await reload();
  }
  function moveMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const value = new Date(y, m - 1 + delta, 1);
    if (value.getFullYear() >= 1900 && value.getFullYear() <= 9998)
      setMonth(
        `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`,
      );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-mark">
            <BarChart3 size={24} />
          </span>
          <span>
            expense<span className="brand-light">intelligence</span>
          </span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => navigate(name)}
              aria-current={page === name ? "page" : undefined}
            >
              <Icon size={19} />
              {name}
              {page === name && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Your money. Your data.</strong>
              <small>Stored locally on your device.</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">ME</span>
            <div>
              <strong>Personal account</strong>
              <small>Local workspace · USD</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="month-picker">
            <button
              className="icon-btn"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <label>
              <span className="sr-only">Selected month</span>
              <input
                type="month"
                min="1900-01"
                max="9998-12"
                value={month}
                onChange={(e) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                    setMonth(e.target.value);
                }}
              />
            </label>
            <button
              className="icon-btn"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </header>
        <main>
          {error ? (
            <div role="alert" className="card error-block">
              <h2>Couldn’t load your finances</h2>
              <p>{error}. Check that the backend is running.</p>
              <button className="secondary" onClick={() => void reload()}>
                <RefreshCw size={15} /> Try again
              </button>
            </div>
          ) : loading ? (
            <div className="loading" role="status">
              <div className="spinner" />
              Gathering your finances…
            </div>
          ) : (
            data && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {page === "Overview" && (
                    <Overview
                      data={data}
                      month={month}
                      navigate={navigate}
                      add={add}
                    />
                  )}
                  {page === "Transactions" && (
                    <Transactions
                      key={month}
                      rows={data.transactions}
                      month={month}
                      add={add}
                      edit={(t) => {
                        setTransaction(t);
                        setForm("transaction");
                      }}
                      remove={(t) => {
                        setDeleteError("");
                        setDeleting(t);
                      }}
                      importCSV={() => setForm("import")}
                    />
                  )}
                  {page === "Budgets & goals" && (
                    <Budgets
                      rows={data.budgets}
                      add={addBudget}
                      edit={(b) => {
                        setBudget(b);
                        setForm("budget");
                      }}
                    />
                  )}
                  {page === "Achievements" && (
                    <Achievements progress={data.progress} />
                  )}
                </motion.div>
              </AnimatePresence>
            )
          )}
          <footer>
            Expense Intelligence{" "}
            <span>Built for clarity. Designed for everyday life.</span>
            <span className="footer-local">
              <span className="online-dot" /> Local-first
            </span>
          </footer>
        </main>
      </div>
      {form === "transaction" && (
        <TransactionForm
          transaction={transaction}
          month={month}
          close={() => setForm(null)}
          done={done}
        />
      )}
      {form === "budget" && (
        <BudgetForm
          budget={budget}
          month={month}
          close={() => setForm(null)}
          done={done}
        />
      )}
      {form === "import" && (
        <ImportForm close={() => setForm(null)} done={done} />
      )}
      {deleting && (
        <Modal title="Delete transaction?" onClose={() => setDeleting(null)}>
          <p className="helper">
            “{deleting.description}” will be permanently removed. This cannot be
            undone.
          </p>
          {deleteError && (
            <p role="alert" className="error">
              {deleteError}
            </p>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={() => setDeleting(null)}>
              Keep transaction
            </button>
            <button
              className="danger"
              disabled={deleteBusy}
              onClick={async () => {
                setDeleteBusy(true);
                try {
                  await api(`/transactions/${deleting.id}`, {
                    method: "DELETE",
                  });
                  setDeleting(null);
                  await done("Transaction deleted");
                } catch (e) {
                  setDeleteError((e as Error).message);
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete transaction"}
            </button>
          </div>
        </Modal>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={19} />
            {toast}
            <button
              className="icon-btn"
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
