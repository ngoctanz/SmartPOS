"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BulkActions } from "./bulk-actions";

export interface ServerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CommonTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterCol?: string;
  filterPlaceholder?: string;
  onBulkAction?: (selectedRows: TData[]) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
  // Server-side pagination props
  serverPagination?: ServerPagination;
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  searchValue?: string;
  toolbarActions?: React.ReactNode;
}

export function CommonTable<TData, TValue>({
  columns,
  data,
  filterCol,
  filterPlaceholder = "Filter...",
  onBulkAction,
  canSelectRow,
  bulkActionLabel,
  bulkActionIcon,
  onSelectionChange,
  // Server-side pagination
  serverPagination,
  onPageChange,
  onSearch,
  searchValue,
  toolbarActions,
}: CommonTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [localSearch, setLocalSearch] = React.useState("");

  const isServerSide = !!serverPagination;

  // Reset selection when data changes
  React.useEffect(() => {
    setRowSelection({});
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // Only use client-side pagination/filtering if not server-side
    ...(isServerSide
      ? {
          manualPagination: true,
          manualFiltering: true,
          pageCount: serverPagination.totalPages,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
        }),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: canSelectRow
      ? (row: Row<TData>) => canSelectRow(row.original)
      : true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(isServerSide && {
        pagination: {
          pageIndex: serverPagination.page - 1,
          pageSize: serverPagination.limit,
        },
      }),
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkAction = () => {
    if (onBulkAction && selectedCount > 0) {
      onBulkAction(selectedRows.map((row) => row.original));
    }
  };

  const clearSelection = () => {
    setRowSelection({});
  };

  React.useEffect(() => {
    if (onSelectionChange) {
      const selected = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selected);
    }
  }, [rowSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search input
  const handleSearchChange = (value: string) => {
    if (isServerSide && onSearch) {
      onSearch(value);
    } else if (filterCol) {
      table.getColumn(filterCol)?.setFilterValue(value);
      setLocalSearch(value);
    }
  };

  // Get current search value
  const currentSearchValue = isServerSide
    ? searchValue ?? ""
    : localSearch;

  // Pagination handlers
  const handlePreviousPage = () => {
    if (isServerSide && onPageChange) {
      onPageChange(serverPagination.page - 1);
    } else {
      table.previousPage();
    }
  };

  const handleNextPage = () => {
    if (isServerSide && onPageChange) {
      onPageChange(serverPagination.page + 1);
    } else {
      table.nextPage();
    }
  };

  const canPreviousPage = isServerSide
    ? serverPagination.page > 1
    : table.getCanPreviousPage();

  const canNextPage = isServerSide
    ? serverPagination.page < serverPagination.totalPages
    : table.getCanNextPage();

  // Row counts for display
  const totalRows = isServerSide
    ? serverPagination.total
    : table.getFilteredRowModel().rows.length;

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full">
      {/* Bulk Actions Bar */}
      {onBulkAction && (
        <BulkActions
          selectedCount={selectedCount}
          onAction={handleBulkAction}
          onClearSelection={clearSelection}
          className="mb-4"
          actionLabel={bulkActionLabel}
          actionIcon={bulkActionIcon}
        />
      )}

      {(filterCol || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
          {toolbarActions && (
            <div className="flex items-center gap-2">
              {toolbarActions}
            </div>
          )}
          {filterCol && (
            <Input
              placeholder={filterPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="max-w-sm"
            />
          )}
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRowCount > 0 ? (
            <>
              {selectedRowCount}/{totalRows} hàng được chọn
            </>
          ) : isServerSide ? (
            <>
              Trang {serverPagination.page}/{serverPagination.totalPages} ({totalRows} kết quả)
            </>
          ) : (
            <>{totalRows} kết quả</>
          )}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!canPreviousPage}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!canNextPage}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
