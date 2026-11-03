import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  Landmark,
  Target,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "motion/react";
import type { Snapshot } from "../types";
import { money, TransactionTable } from "../components/TransactionTable";
const colors = [
  "#46d9af",
  "#5daef3",
  "#b398ff",
  "#f1b566",
  "#ea87ad",
  "#7dcece",
  "#8cb481",
  "#6b788c",
];
export function Overview({
  data,
  month,
  navigate,
  add,
}: {
  data: Snapshot;
  month: string;
  navigate: (page: string) => void;
  add: () => void;
}) {
  const { summary: s, progress: p } = data;
  const rows = data.transactions
    .filter((t) => t.date.startsWith(month))
    .slice(0, 5);
  const cats = data.categories.filter((c) => c.amount_cents > 0);
  const stats = [
    {
      label: "Total expenses",
      value: money(s.expenses_cents),
      icon: Wallet,
      detail:
        s.change_percent === null
          ? "No prior-month spending"
          : `${Math.abs(s.change_percent)}% ${s.change_percent >= 0 ? "more" : "less"} than last month`,
      tone: "",
    },
    {
      label: "Total income",
      value: money(s.income_cents),
      icon: TrendingUp,
      detail: "Money coming in this month",
      tone: "positive",
    },
    {
      label: "Net balance",
      value: money(s.net_cents),
      icon: Landmark,
      detail: "Income minus expenses",
      tone: s.net_cents >= 0 ? "positive" : "danger-text",
    },
    {
      label: "Monthly budget used",
      value: s.budget_cents
        ? `${s.budget_utilization.toFixed(1)}%`
        : "No budget",
      icon: Target,
      detail: s.budget_cents
        ? `${money(s.budget_spent_cents)} of ${money(s.budget_cents)}`
        : "Set your first category limit",
      tone: "",
    },
  ];
  return (
    <>
      <div className="intro">
        <div>
          <span className="eyebrow">YOUR MONEY, A LITTLE CLEARER</span>
          <h1>
            A clearer view of your finances<span className="positive">.</span>
          </h1>
          <p>Small insights. Better habits. A little more peace of mind.</p>
        </div>
        <button className="primary" onClick={add}>
          + Add transaction
        </button>
      </div>
      <div className="metrics">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card metric"
            key={stat.label}
          >
            <div className="metric-label">
              {stat.label}
              <stat.icon size={17} />
            </div>
            <div className={`metric-number ${stat.tone}`}>{stat.value}</div>
            <small>
              {i === 0 && s.change_percent !== null ? (
                s.change_percent <= 0 ? (
                  <ArrowDownRight size={13} />
                ) : (
                  <ArrowUpRight size={13} />
                )
              ) : null}
              {stat.detail}
            </small>
          </motion.div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Spending by category</h2>
              <p>Where your money went</p>
            </div>
            <span className="subtle-pill">This month</span>
          </div>
          {cats.length ? (
            <div className="donut-layout">
              <div className="donut">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={cats}
                      dataKey="amount_cents"
                      nameKey="category"
                      innerRadius={73}
                      outerRadius={92}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {cats.map((c, i) => (
                        <Cell
                          key={c.category}
                          fill={colors[i % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => money(v)}
                      contentStyle={{
                        background: "#19222c",
                        border: "1px solid #35414d",
                        borderRadius: 10,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-label">
                  <small>Total spent</small>
                  <strong>{money(s.expenses_cents)}</strong>
                </div>
              </div>
              <div className="legend">
                {cats.map((c, i) => (
                  <div key={c.category}>
                    <span>
                      <i style={{ background: colors[i % colors.length] }} />
                      {c.category}
                    </span>
                    <strong>{money(c.amount_cents)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty chart-empty">
              Your spending breakdown will appear with your first expense.
            </div>
          )}
          <div className="card-foot">
            Largest category{" "}
            <strong>{s.largest_category || "No expenses yet"}</strong>
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Cash flow</h2>
              <p>Your last six months at a glance</p>
            </div>
            <div className="chart-key">
              <span>
                <i style={{ background: "#42d6ad" }} />
                Expenses
              </span>
              <span>
                <i style={{ background: "#3b5a58" }} />
                Income
              </span>
            </div>
          </div>
          <div className="bar-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.trends} barGap={5}>
                <CartesianGrid
                  stroke="#27313b"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) =>
                    new Date(v + "-02").toLocaleString("en-US", {
                      month: "short",
                    })
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8795a5", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v) => `$${v / 100}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8795a5", fontSize: 11 }}
                  width={55}
                />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  cursor={{ fill: "#ffffff05" }}
                  contentStyle={{
                    background: "#19222c",
                    border: "1px solid #35414d",
                    borderRadius: 10,
                  }}
                />
                <Bar
                  name="Expenses"
                  dataKey="expenses_cents"
                  fill="#42d6ad"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Income"
                  dataKey="income_cents"
                  fill="#3b5a58"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-foot">
            Average daily spending{" "}
            <strong>{money(s.daily_average_cents)}</strong>
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Recent transactions</h2>
              <p>The latest activity this month</p>
            </div>
            <button
              className="text-btn"
              onClick={() => navigate("Transactions")}
            >
              View all <ChevronRight size={15} />
            </button>
          </div>
          <TransactionTable rows={rows} />
        </section>
        <section className="card progress-card">
          <span className="spark-icon">
            <Sparkles size={24} />
          </span>
          <span className="eyebrow">BUILDING BETTER HABITS</span>
          <h2>Every small step counts.</h2>
          <p>Make room for your future with a little intention today.</p>
          <div className="level-line">
            <strong>
              Level {p.level} ·{" "}
              {p.level === 1 ? "Getting started" : "Money mindful"}
            </strong>
            <span>{p.xp} XP</span>
          </div>
          <div className="progress-track">
            <div style={{ width: `${(p.xp % 200) / 2}%` }} />
          </div>
          <small>{p.next_level_xp} XP to your next level</small>
          <button
            className="secondary"
            onClick={() => navigate("Achievements")}
          >
            Explore achievements <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
