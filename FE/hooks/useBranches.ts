import * as React from "react";
import { toast } from "sonner";
import branchService, { Branch } from "@/service/branch.service";

interface UseBranchesOptions {
  defaultBranchId?: string;
}

interface UseBranchesReturn {
  branches: Branch[];
  selectedBranch: string;
  setSelectedBranch: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  getBranchName: (branchId?: string) => string | undefined;
}

export function useBranches(
  options: UseBranchesOptions = {}
): UseBranchesReturn {
  const { defaultBranchId } = options;

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadBranches = async () => {
      setIsLoading(true);
      try {
        const response = await branchService.getAll();
        if (response.success && response.data) {
          setBranches(response.data);
          if (defaultBranchId) {
            setSelectedBranch(defaultBranchId);
          } else if (response.data.length > 0) {
            setSelectedBranch(response.data[0]._id);
          }
        }
      } catch {
        toast.error("Không thể tải danh sách chi nhánh");
      } finally {
        setIsLoading(false);
      }
    };
    loadBranches();
  }, [defaultBranchId]);

  const getBranchName = React.useCallback(
    (branchId?: string) => {
      const id = branchId || selectedBranch;
      const branch = branches.find((b) => b._id === id);
      return branch?.branchName;
    },
    [branches, selectedBranch]
  );

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    isLoading,
    getBranchName,
  };
}
