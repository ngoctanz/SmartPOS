import { useState, useEffect, useCallback } from "react";

interface UseStatsOptions<T> {
  fetchFn: (params?: any) => Promise<{ data?: T }>;
  params?: any;
  dependencies?: any[];
}

export function useStats<T>({ fetchFn, params, dependencies = [] }: UseStatsOptions<T>) {
  const [stats, setStats] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchFn(params);
      if (res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, params, ...dependencies]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
