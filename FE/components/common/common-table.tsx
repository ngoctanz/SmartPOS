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
import { BulkActions, AdditionalBulkAction } from "./bulk-actions";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";

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
  canSelectRow?: (row: TData) => boolean;
  bulkActionLabel?: string;
  bulkActionIcon?: "trash" | "lock" | "printer";
  additionalBulkActions?: AdditionalBulkAction[];
  // Server-side pagination props
  serverPagination?: ServerPagination;
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  searchValue?: string;
  toolbarActions?: React.ReactNode;
  // Column visibility props
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
  ) => void;
  // Loading state
  isLoading?: boolean;
  // Custom row className
  getRowClassName?: (row: TData) => string;
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
  additionalBulkActions,
  onSelectionChange,
  // Server-side pagination
  serverPagination,
  onPageChange,
  onSearch,
  searchValue,
  toolbarActions,
  // Column visibility
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  // Loading state
  isLoading = false,
  // Custom row className
  getRowClassName,
}: CommonTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [localSearch, setLocalSearch] = React.useState("");

  const isServerSide = !!serverPagination;

  // Use external columnVisibility if provided, otherwise use internal state
  const columnVisibility =
    externalColumnVisibility !== undefined
      ? externalColumnVisibility
      : internalColumnVisibility;

  const handleColumnVisibilityChange = React.useCallback(
    (
      updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
    ) => {
      if (onColumnVisibilityChange) {
        onColumnVisibilityChange(updater);
      } else {
        setInternalColumnVisibility(updater);
      }
    },
    [onColumnVisibilityChange],
  );

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
    onColumnVisibilityChange: handleColumnVisibilityChange,
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
  const currentSearchValue = isServerSide ? (searchValue ?? "") : localSearch;

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
    <div className="w-full space-y-4">
      {/* Bulk Actions Bar */}
      {onBulkAction && (
        <BulkActions
          selectedCount={selectedCount}
          onAction={handleBulkAction}
          onClearSelection={clearSelection}
          actionLabel={bulkActionLabel}
          actionIcon={bulkActionIcon}
          additionalActions={additionalBulkActions}
        />
      )}

      {(filterCol || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          {/* Toolbar Actions (filters, etc.) */}
          {toolbarActions}
          
          {/* Search Input */}
          {filterCol && (
            <Input
              placeholder={filterPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="w-full sm:max-w-sm"
            />
          )}
          
          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto sm:ml-auto">
                <Settings2 className="mr-2 h-4 w-4" />
                Cột hiển thị
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  // Get header text - use id if header is a function
                  const headerText =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {headerText}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-visible"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Table className="w-full min-w-[640px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-muted-foreground">Đang tải...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`transition-colors ${getRowClassName ? getRowClassName(row.original) : ""}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Không có dữ liệu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {selectedRowCount > 0 ? (
            <span className="font-medium text-primary">
              {selectedRowCount}/{totalRows} hàng được chọn
            </span>
          ) : isServerSide ? (
            <>
              Trang <span className="font-medium">{serverPagination.page}</span>
              /
              <span className="font-medium">{serverPagination.totalPages}</span>{" "}
              ({totalRows} kết quả)
            </>
          ) : (
            <>{totalRows} kết quả</>
          )}
        </div>
        <div className="flex items-center gap-2">
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
