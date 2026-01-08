"use client";

import * as React from "react";
import { CommonTable } from "@/components/common/common-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Calendar, AlertTriangle } from "lucide-react";
import { Receipt } from "@/service/receipt.service";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format.utils";
import { useRouter } from "next/navigation";

interface ErrorReceiptListProps {
  data: Receipt[];
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  searchValue: string;
}

export function ErrorReceiptList({
  data,
  isLoading,
  pagination,
  onPageChange,
  onSearch,
  searchValue,
}: ErrorReceiptListProps) {
  const router = useRouter();

  const handleRecreate = (receipt: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/tao-moi?fromError=${receipt.code}`);
  };

  const handleViewDetail = (receipt: Receipt) => {
    router.push(`/trang-quan-ly/hoa-don/${receipt.code}`);
  };

  const columns = React.useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Mã hóa đơn",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-mono font-medium">{row.original.code}</span>
          </div>
        ),
      },
      {
        accessorKey: "branchId",
        header: "Chi nhánh",
        cell: ({ row }) => {
          const branch = row.original.branchId;
          return typeof branch === "object" ? branch.branchName : "—";
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Tổng tiền",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: "createdBy",
        header: "Người tạo",
        cell: ({ row }) => {
          const creator = row.original.createdBy;
          return (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">
                {typeof creator === "object"
                  ? creator.name || creator.userName
                  : "—"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "markedErrorBy",
        header: "Đánh dấu bởi",
        cell: ({ row }) => {
          const marker = row.original.markedErrorBy;
          return (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">
                {marker && typeof marker === "object"
                  ? marker.name || marker.userName
                  : "—"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}
          </div>
        ),
      },
      {
        accessorKey: "markedErrorAt",
        header: "Ngày đánh dấu lỗi",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {row.original.markedErrorAt
              ? format(new Date(row.original.markedErrorAt), "dd/MM/yyyy HH:mm")
              : "—"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetail(row.original)}
            >
              Xem
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleRecreate(row.original)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tạo lại
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold">Danh sách hóa đơn lỗi</h3>
          <Badge variant="destructive">{pagination.total}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            </div>
          </div>
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          filterCol="code"
          filterPlaceholder="Tìm theo mã hóa đơn..."
          serverPagination={pagination}
          onPageChange={onPageChange}
          onSearch={onSearch}
          searchValue={searchValue}
        />
      )}
    </div>
  );
}
