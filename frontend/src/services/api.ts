import type { Snapshot } from "../types";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "Server unavailable" }));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.detail?.map((x: { msg: string }) => x.msg).join("; ") ||
          "Request failed",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function snapshot(month: string): Promise<Snapshot> {
  const [summary, categories, trends, budgets, transactions, progress] =
    await Promise.all([
      api<Snapshot["summary"]>(`/analytics/summary?month=${month}`),
      api<Snapshot["categories"]>(`/analytics/categories?month=${month}`),
      api<Snapshot["trends"]>(`/analytics/trends?month=${month}`),
      api<Snapshot["budgets"]>(`/budgets?month=${month}`),
      api<Snapshot["transactions"]>("/transactions"),
      api<Snapshot["progress"]>("/achievements"),
    ]);
  return { summary, categories, trends, budgets, transactions, progress };
}
