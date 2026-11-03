export const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Education",
  "Other",
];
export type Transaction = {
  id: number;
  date: string;
  description: string;
  merchant: string;
  amount: string;
  type: "income" | "expense";
  category: string;
  created_at: string;
};
export type Budget = {
  id: number;
  month: string;
  category: string;
  amount_cents: number;
  spent_cents: number;
  remaining_cents: number;
  utilization: number;
};
export type Summary = {
  expenses_cents: number;
  income_cents: number;
  net_cents: number;
  budget_cents: number;
  budget_spent_cents: number;
  budget_utilization: number;
  change_percent: number | null;
  daily_average_cents: number;
  largest_category: string | null;
};
export type Progress = {
  xp: number;
  level: number;
  next_level_xp: number;
  achievements: {
    key: string;
    title: string;
    description: string;
    xp: number;
    unlocked: boolean;
    earned_at: string | null;
  }[];
};
export type ImportPreview = {
  csv: string;
  rows: {
    row: number;
    status: "valid" | "invalid" | "duplicate";
    data: Record<string, string>;
    error: string | null;
  }[];
};
export type Snapshot = {
  summary: Summary;
  categories: { category: string; amount_cents: number }[];
  trends: { month: string; expenses_cents: number; income_cents: number }[];
  budgets: Budget[];
  transactions: Transaction[];
  progress: Progress;
};
