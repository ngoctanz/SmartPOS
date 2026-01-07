import { useState, useEffect, useCallback } from "react";
import { ServerPagination } from "@/components/common/common-table";

interface UseTableDataOptions<T> {
  fetchFn: (params: any) => Promise<{ data?: T[]; pagination?: ServerPagination }>;
  initialFilters?: Record<string, any>;
  dependencies?: any[];
}

export function useTableData<T>({ fetchFn, initialFilters = {}, dependencies = [] }: UseTableDataOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState<ServerPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        ...filters,
      };

      const res = await fetchFn(params);
      
      if (res.data) {
        setData(res.data);
      }
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, filters, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  const updateFilters = (newFilters: Record<string, any>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return {
    data,
    loading,
    searchTerm,
    pagination,
    handlePageChange,
    handleSearch,
    filters,
    updateFilters,
    refetch: fetchData,
  };
}
