import { useState, useEffect, useRef, useCallback } from "react";

interface UseStatsOptions<T> {
  fetchFn: () => Promise<{ data?: T }>;
  dependencies?: any[];
}

export function useStats<T>({ fetchFn, dependencies = [] }: UseStatsOptions<T>) {
  const [stats, setStats] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Store fetchFn in a ref to avoid dependency issues (fetchFn is often an arrow function created on each render)
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchFnRef.current();
      if (res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - fetchFnRef.current always has latest function

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]); // Only re-run when dependencies actually change

  return { stats, loading, refetch: fetchStats };
}
