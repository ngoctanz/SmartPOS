"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommonTable } from "@/components/common/common-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Loader2,
  Printer,
  Eye,
  ExternalLink,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import receiptService, { Receipt, ReceiptStats } from "@/service/receipt.service";
import branchService, { Branch } from "@/service/branch.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrintBill, printStyles } from "@/components/receipt";
import { formatCurrency } from "@/utils/format.utils";
import { StatsCard } from "@/components/common/stats-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useFilteredTableData } from "@/hooks/useFilteredTableData";
import { useStats } from "@/hooks/useStats";

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const printRef = React.useRef<HTMLDivElement>(null);

  // Use custom hooks
  const { 
    data, 
    loading, 
    searchTerm, 
    pagination, 
    filters,
    handlePageChange, 
    handleSearch,
    updateFilter,
  } = useFilteredTableData<Receipt, { branchId?: string; status?: string }>({
    fetchFn: receiptService.getAll,
    initialFilters: { branchId: undefined, status: undefined },
  });

  const { stats } = useStats<ReceiptStats>({
    fetchFn: () => receiptService.getStats(isAdmin ? filters.branchId : undefined),
    dependencies: [filters.branchId, isAdmin],
  });

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Receipt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [showPrintDialog, setShowPrintDialog] = React.useState(false);

  // Fetch branches
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchService.getAll();
        if (res.data) setBranches(res.data);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
      }
    };
    fetchBranches();
  }, []);

  const handleView = (item: Receipt) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handlePrint = (item: Receipt) => {
    setSelectedItem(item);
    setShowPrintDialog(true);
  };

  const handleViewDetail = (item: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/${item.code}`);
  };

  const executePrint = () => {
    // Add print styles
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    window.print();

    // Cleanup
    setTimeout(() => {
      document.head.removeChild(styleSheet);
      setShowPrintDialog(false);
    }, 1000);
  };

  const getBranchName = (
    branchId: string | { _id: string; branchName: string }
  ) => {
    if (typeof branchId === "object") return branchId.branchName;
    const branch = branches.find((b) => b._id === branchId);
    return branch ? branch.branchName : branchId;
  };

  const getCashierName = (
    cashier: string | { _id: string; userName: string; name?: string }
  ) => {
    if (typeof cashier === "object") return cashier.name || cashier.userName;
    return cashier;
  };

  const columns = React.useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "code",
        header: "Mã hóa đơn",
        cell: ({ row }) => {
          const code = row.getValue("code") as string;
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary"
              onClick={() => handleViewDetail(row.original)}
            >
              {code}
            </Button>
          );
        },
      },
      // Chỉ hiển thị cột chi nhánh cho admin
      ...(isAdmin ? [{
        accessorKey: "branchId" as const,
        header: "Chi nhánh",
        cell: ({ row }: { row: any }) => {
          const branchId = row.getValue("branchId") as
            | string
            | { _id: string; branchName: string };
          return getBranchName(branchId);
        },
      }] : []),
      {
        accessorKey: "createdBy",
        header: "Người lập",
        cell: ({ row }) => {
          const cashier = row.getValue("createdBy") as
            | string
            | { _id: string; userName: string; name?: string };
          return getCashierName(cashier);
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày lập",
        cell: ({ row }) => {
          try {
            return format(
              new Date(row.getValue("createdAt")),
              "dd/MM/yyyy HH:mm"
            );
          } catch {
            return row.getValue("createdAt");
          }
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Thanh toán",
        cell: ({ row }) => {
          const method = row.getValue("paymentMethod") as string;
          return method === "cash"
            ? "Tiền mặt"
            : method === "card"
            ? "Thẻ"
            : "Chuyển khoản";
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Tổng tiền",
        cell: ({ row }) => formatCurrency(row.getValue("totalAmount")),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              variant={
                status === "completed"
                  ? "default"
                  : status === "pending"
                  ? "secondary"
                  : "destructive"
              }
            >
              {status === "completed"
                ? "Hoàn thành"
                : status === "pending"
                ? "Chờ thanh toán"
                : "Đã hủy"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          const isAnyRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  disabled={isAnyRowSelected}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(row.original)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem nhanh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewDetail(row.original)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrint(row.original)}>
                  <Printer className="h-4 w-4 mr-2" />
                  In hóa đơn
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [branches, isAdmin] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toolbarActions = (
    <>
      {isAdmin && (
        <Select 
          value={filters.branchId || "all"} 
          onValueChange={(value) => updateFilter("branchId", value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả chi nhánh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chi nhánh</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch._id} value={branch._id}>
                {branch.branchName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select 
        value={filters.status || "all"} 
        onValueChange={(value) => updateFilter("status", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="pending">Chờ thanh toán</SelectItem>
          <SelectItem value="completed">Hoàn thành</SelectItem>
          <SelectItem value="cancelled">Đã hủy</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý hóa đơn</h1>
        <Button onClick={() => router.push("/trang-quan-ly/hoa-don/tao-moi")}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo hóa đơn
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Tổng hóa đơn"
          value={stats?.totalReceipts || 0}
          icon={FileText}
          description="Tổng số hóa đơn bán hàng"
        />
        <StatsCard
          title="Chờ xử lý"
          value={stats?.pendingCount || 0}
          icon={Clock}
          description="Hóa đơn chờ thanh toán"
          trend="neutral"
        />
        <StatsCard
          title="Hoàn thành"
          value={stats?.completedCount || 0}
          icon={CheckCircle}
          description="Hóa đơn đã hoàn tất"
          trend="positive"
        />
        <StatsCard
          title="Tổng doanh thu"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          description="Doanh thu từ các đơn thành công"
        />
      </div>

      <CommonTable
        columns={columns}
        data={data}
        filterCol="code"
        filterPlaceholder="Tìm mã hóa đơn..."
        toolbarActions={toolbarActions}
        serverPagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={searchTerm}
      />

      {/* Quick View Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn</DialogTitle>
            <DialogDescription>Xem nhanh thông tin hóa đơn</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              {/* Thông tin cơ bản - 2 cột */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mã hóa đơn</Label>
                  <p className="font-mono font-medium">{selectedItem.code}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                  <div>
                    <Badge
                      variant={
                        selectedItem.status === "completed"
                          ? "default"
                          : selectedItem.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {selectedItem.status === "completed"
                        ? "Hoàn thành"
                        : selectedItem.status === "pending"
                        ? "Chờ thanh toán"
                        : "Đã hủy"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Ngày lập</Label>
                  <p className="text-sm">
                    {format(new Date(selectedItem.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tổng tiền</Label>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedItem.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Payment QR Code for transfer payments */}
              {selectedItem.paymentMethod === "transfer" &&
                selectedItem.paymentInfo?.checkoutUrl && (
                  <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                    <h4 className="mb-3 font-medium text-center text-sm">
                      Mã QR Thanh toán
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-lg border">
                        <QRCodeSVG
                          value={selectedItem.paymentInfo.checkoutUrl}
                          size={160}
                          level="H"
                        />
                      </div>
                      <div className="text-center text-sm">
                        <p className="text-muted-foreground">
                          Trạng thái:{" "}
                          <Badge
                            variant={
                              selectedItem.paymentInfo.status === "paid"
                                ? "default"
                                : selectedItem.paymentInfo.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {selectedItem.paymentInfo.status === "paid"
                              ? "Đã thanh toán"
                              : selectedItem.paymentInfo.status === "pending"
                              ? "Chờ thanh toán"
                              : selectedItem.paymentInfo.status === "cancelled"
                              ? "Đã hủy"
                              : selectedItem.paymentInfo.status === "expired"
                              ? "Hết hạn"
                              : "Chưa xác định"}
                          </Badge>
                        </p>
                        {selectedItem.paymentInfo.checkoutUrl &&
                          selectedItem.paymentInfo.status === "pending" && (
                            <a
                              href={selectedItem.paymentInfo.checkoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline mt-2 inline-block text-xs"
                            >
                              Mở trang thanh toán
                            </a>
                          )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Danh sách sản phẩm */}
              <div className="mt-2">
                <h4 className="mb-2 font-medium text-sm">
                  Danh sách sản phẩm ({selectedItem.listProduct.length})
                </h4>
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium">Sản phẩm</th>
                        <th className="p-2 text-center font-medium">SL</th>
                        <th className="p-2 text-right font-medium">Đơn giá</th>
                        <th className="p-2 text-right font-medium">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.listProduct.map((p, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2">{p.productName}</td>
                          <td className="p-2 text-center">{p.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(p.salePrice)}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(p.salePrice * p.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedItem) handlePrint(selectedItem);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              In hóa đơn
            </Button>
            <Button
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedItem) handleViewDetail(selectedItem);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Xem chi tiết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước hóa đơn</DialogTitle>
            <DialogDescription>
              Xem trước trước khi in hóa đơn
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="flex justify-center py-4 bg-gray-100 rounded-lg">
              <PrintBill ref={printRef} receipt={selectedItem} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Hủy
            </Button>
            <Button onClick={executePrint}>
              <Printer className="h-4 w-4 mr-2" />
              In hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      {selectedItem && (
        <div className="hidden">
          <PrintBill ref={printRef} receipt={selectedItem} />
        </div>
      )}
    </div>
  );
}
