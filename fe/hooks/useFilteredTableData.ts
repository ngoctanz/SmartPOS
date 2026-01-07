import { useState, useEffect, useCallback } from "react";
import { ServerPagination } from "@/components/common/common-table";

interface UseFilteredTableDataOptions<T, F> {
  fetchFn: (params: any) => Promise<{ data?: T[]; pagination?: ServerPagination }>;
  initialFilters: F;
}

export function useFilteredTableData<T, F extends Record<string, any>>({ 
  fetchFn, 
  initialFilters 
}: UseFilteredTableDataOptions<T, F>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<F>(initialFilters);
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

  // Build query params
  const buildParams = useCallback(() => {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch || undefined,
    };

    // Add filters (skip "all" values)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params[key] = value;
      }
    });

    return params;
  }, [pagination.page, pagination.limit, debouncedSearch, filters]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildParams();
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
  }, [buildParams, fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  const updateFilter = <K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return {
    data,
    loading,
    searchTerm,
    pagination,
    filters,
    handlePageChange,
    handleSearch,
    updateFilter,
    refetch: fetchData,
  };
}
