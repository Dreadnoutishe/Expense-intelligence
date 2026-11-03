import { useCallback, useEffect, useRef, useState } from "react";
import { snapshot } from "../services/api";
import type { Snapshot } from "../types";
export function useFinance(month: string) {
  const [data, setData] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const next = await snapshot(month);
      if (current === generation.current) setData(next);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { data, loading, error, reload };
}
