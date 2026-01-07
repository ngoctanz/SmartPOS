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
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<Receipt[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Receipt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [stats, setStats] = useState<ReceiptStats>({
      totalReceipts: 0,
      pendingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalRevenue: 0
  });

  const [filterBranchId, setFilterBranchId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const status = filterStatus !== "all" ? filterStatus : undefined;
        const targetBranchId = isAdmin 
            ? (filterBranchId !== "all" ? filterBranchId : undefined)
            : user?.branchId;

        const [receiptsRes, branchesRes, statsRes] = await Promise.all([
          receiptService.getAll({
            branchId: targetBranchId,
            status
          }),
          branchService.getAll(),
          receiptService.getStats(targetBranchId)
        ]);

        if (receiptsRes.success && receiptsRes.data) {
          setData(receiptsRes.data);
        }
        if (branchesRes.success && branchesRes.data) {
          setBranches(branchesRes.data);
        }
        if (statsRes.success && statsRes.data) {
            setStats(statsRes.data);
        }
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, filterBranchId, filterStatus, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const columns = useMemo<ColumnDef<Receipt>[]>(
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
      {
        accessorKey: "branchId",
        header: "Chi nhánh",
        cell: ({ row }) => {
          const branchId = row.getValue("branchId") as
            | string
            | { _id: string; branchName: string };
          return getBranchName(branchId);
        },
      },
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
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
        ),
      },
    ],
    [branches] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  
  const toolbarActions = (
      <>
        {isAdmin && (
           <Select value={filterBranchId} onValueChange={setFilterBranchId}>
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
            value={filterStatus}
            onValueChange={setFilterStatus}
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
          value={stats.totalReceipts}
          icon={FileText}
          description="Tổng số hóa đơn bán hàng"
        />
        <StatsCard
          title="Chờ xử lý"
          value={stats.pendingCount}
          icon={Clock}
          description="Hóa đơn chờ thanh toán"
          trend="neutral"
        />
        <StatsCard
          title="Hoàn thành"
          value={stats.completedCount}
          icon={CheckCircle}
          description="Hóa đơn đã hoàn tất"
          trend="positive"
        />
        <StatsCard
          title="Tổng doanh thu"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          description="Doanh thu từ các đơn thành công"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <CommonTable
            columns={columns}
            data={data}
            filterCol="code"
            filterPlaceholder="Tìm mã hóa đơn..."
            toolbarActions={toolbarActions}
        />
      )}

      {/* Quick View Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn</DialogTitle>
            <DialogDescription>Xem nhanh thông tin hóa đơn</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Mã HĐ</Label>
                <Input
                  defaultValue={selectedItem.code}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Ngày lập</Label>
                <Input
                  defaultValue={format(
                    new Date(selectedItem.createdAt),
                    "dd/MM/yyyy HH:mm"
                  )}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Tổng tiền</Label>
                <Input
                  defaultValue={new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(selectedItem.totalAmount)}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Trạng thái</Label>
                <div className="col-span-3">
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

              {/* Payment QR Code for transfer payments */}
              {selectedItem.paymentMethod === "transfer" &&
                selectedItem.paymentInfo?.checkoutUrl && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                    <h4 className="mb-3 font-medium text-center">
                      Mã QR Thanh toán
                    </h4>
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-lg border">
                        <QRCodeSVG
                          value={selectedItem.paymentInfo.checkoutUrl}
                          size={180}
                          level="H"
                          includeMargin
                        />
                      </div>
                      <div className="text-center text-sm">
                        <p className="text-muted-foreground">
                          Trạng thái thanh toán:{" "}
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
                              className="text-primary hover:underline mt-2 inline-block"
                            >
                              Mở trang thanh toán
                            </a>
                          )}
                      </div>
                    </div>
                  </div>
                )}

              <div className="mt-4">
                <h4 className="mb-2 font-medium">Danh sách sản phẩm</h4>
                <div className="border rounded-md p-2 text-sm max-h-40 overflow-y-auto">
                  {selectedItem.listProduct.map((p, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-1 border-b last:border-0"
                    >
                      <span>
                        {p.productName} (x{p.quantity})
                      </span>
                      <span>
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(p.salePrice * p.quantity)}
                      </span>
                    </div>
                  ))}
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
