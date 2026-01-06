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

interface CommonTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterCol?: string;
  filterPlaceholder?: string;
  onBulkAction?: (selectedRows: TData[]) => void;
  canSelectRow?: (row: TData) => boolean;
  bulkActionLabel?: string;
  bulkActionIcon?: "trash" | "lock";
  onSelectionChange?: (selectedRows: TData[]) => void;
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
}: CommonTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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

      {filterCol && (
        <div className="flex items-center py-4">
          <Input
            placeholder={filterPlaceholder}
            value={
              (table.getColumn(filterCol)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(filterCol)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
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
          {table.getFilteredSelectedRowModel().rows.length}/{""}
          {table.getFilteredRowModel().rows.length} hàng được chọn
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
