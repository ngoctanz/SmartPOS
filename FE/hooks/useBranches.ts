import * as React from "react";
import { toast } from "sonner";
import branchService, { Branch } from "@/service/branch.service";

interface UseBranchesOptions {
  defaultBranchId?: string;
  loadAllOnMount?: boolean; // true = Admin (load all), false = NV (load single)
}

interface UseBranchesReturn {
  branches: Branch[];
  selectedBranch: string;
  setSelectedBranch: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  currentBranch: Branch | undefined;
}

export function useBranches(
  options: UseBranchesOptions = {}
): UseBranchesReturn {
  const { defaultBranchId, loadAllOnMount = false } = options;

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>(
    defaultBranchId || ""
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // Computed: tìm branch đang chọn từ array
  const currentBranch = React.useMemo(
    () => branches.find((b) => b._id === selectedBranch),
    [branches, selectedBranch]
  );

  // Load data 1 lần khi mount
  React.useEffect(() => {
    // Không có defaultBranchId và không loadAll → không làm gì
    if (!loadAllOnMount && !defaultBranchId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        if (loadAllOnMount) {
          // ADMIN: Load tất cả branches
          const response = await branchService.getAll();
          if (response.success && response.data) {
            setBranches(response.data);
            // Auto-select first branch nếu chưa có
            if (!defaultBranchId && response.data[0]) {
              setSelectedBranch(response.data[0]._id);
            }
          }
        } else {
          // NV: Chỉ load 1 branch
          const response = await branchService.getById(defaultBranchId!);
          if (response.success && response.data) {
            setBranches([response.data]);
            setSelectedBranch(response.data._id);
          }
        }
      } catch {
        toast.error("Không thể tải thông tin chi nhánh");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadAllOnMount, defaultBranchId]);

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    isLoading,
    currentBranch,
  };
}
