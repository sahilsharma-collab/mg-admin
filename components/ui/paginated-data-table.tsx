"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  FilterFn,
  getPaginationRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

// Add date filter custom type to allow filtering based on raw date objects
interface DateFilterableData {
  createdAtRaw?: Date;
  updatedAtRaw?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface DataTableProps<TData extends DateFilterableData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey: string | string[];
  redirectUrl: string | null;
  title?: React.ReactNode;
  actionButton?: React.ReactNode;
  loading?: boolean;
  enableDateFilter?: boolean;
  onDateFilterChange?: (filteredData: TData[]) => void;
  // Server-side pagination props
  serverPagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

// Custom comma-separated filter function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commaSeparatedFilterFn: FilterFn<any> = (row, columnId, value) => {
  if (!value) return true;

  const cellValue = row.getValue(columnId);
  if (cellValue == null) return false;

  // Convert cell value to string for comparison
  const stringCellValue = String(cellValue).toLowerCase();

  // Split the search value by commas and trim each term
  const searchTerms = value
    .split(",")
    .map((term: string) => term.trim().toLowerCase());

  // Return true if any of the search terms is found in the cell value
  return searchTerms.some((term: string) => {
    if (term === "") return false; // Skip empty terms
    return stringCellValue.includes(term);
  });
};

export function DataTable<TData extends DateFilterableData, TValue>({
  columns,
  data,
  searchKey,
  redirectUrl,
  title,
  actionButton,
  loading = false,
  enableDateFilter = false,
  onDateFilterChange,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  // Fix 1: Use useEffect to initialize state after component mounts
  const [mounted, setMounted] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [visiblePageButtons, setVisiblePageButtons] = useState<
    (number | string)[]
  >([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10); // Default to 10, will update after mount
  const [pagination, setPagination] = useState({
    pageIndex: 0, // Default to 0, will update after mount
    pageSize: 10, // Default to 10, will update after mount
  });
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<TData[]>([]); // Initialize empty, set after mount

  // Fix 2: Use useEffect to initialize state after component mounts
  useEffect(() => {
    setMounted(true);

    // Initialize state after component mounts to avoid hydration mismatch
    setFilteredData(data);
    setRowsPerPage(serverPagination?.pageSize || 10);
    setPagination({
      pageIndex: serverPagination ? serverPagination.currentPage - 1 : 0,
      pageSize: serverPagination?.pageSize || 10,
    });
  }, [data, serverPagination]);

  // Apply date filtering when dates change (only run on client)
  useEffect(() => {
    if (!mounted) return;

    if (enableDateFilter) {
      let dateFilteredData = [...data];

      if (fromDate) {
        // Set time to start of day
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);

        dateFilteredData = dateFilteredData.filter(
          (item) => item.createdAtRaw && item.createdAtRaw >= from
        );
      }

      if (toDate) {
        // Set time to end of day
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);

        dateFilteredData = dateFilteredData.filter(
          (item) => item.createdAtRaw && item.createdAtRaw <= to
        );
      }

      setFilteredData(dateFilteredData);

      // Call the callback if provided
      if (onDateFilterChange) {
        onDateFilterChange(dateFilteredData);
      }
    } else {
      setFilteredData(data);
    }
  }, [fromDate, toDate, data, enableDateFilter, onDateFilterChange, mounted]);

  // Fix 3: Only set up the table after mounted
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      // Only include pagination if mounted to avoid hydration errors
      ...(mounted
        ? {
            pagination: {
              pageIndex: serverPagination
                ? serverPagination.currentPage - 1
                : pagination.pageIndex,
              pageSize: serverPagination?.pageSize || pagination.pageSize,
            },
          }
        : {}),
    },
    filterFns: {
      commaSeparated: commaSeparatedFilterFn,
    },
    // Add pagination properties only if not using server pagination
    ...(serverPagination
      ? {}
      : {
          onPaginationChange: setPagination,
        }),
  });

  // Set custom filter function for search columns (only after mount)
  useEffect(() => {
    if (!mounted) return;

    if (Array.isArray(searchKey)) {
      searchKey.forEach((key) => {
        const column = table.getColumn(key);
        if (column) {
          column.columnDef.filterFn = commaSeparatedFilterFn;
        }
      });
    } else {
      const column = table.getColumn(searchKey);
      if (column) {
        column.columnDef.filterFn = commaSeparatedFilterFn;
      }
    }
  }, [table, searchKey, mounted]);

  const router = useRouter();

  // Fix 4: Derive these values safely only after mount
  const currentPage = !mounted
    ? 1
    : serverPagination
    ? serverPagination.currentPage
    : pagination.pageIndex + 1;

  const totalPages = !mounted
    ? 1
    : serverPagination
    ? serverPagination.totalPages
    : table.getPageCount();

  const filteredRows = !mounted
    ? 0
    : serverPagination
    ? serverPagination.totalItems
    : table.getFilteredRowModel().rows.length;

  // Update visible page buttons when pagination changes
  useEffect(() => {
    if (!mounted) return;
    updateVisiblePageButtons();
  }, [currentPage, totalPages, mounted, rowsPerPage]);

  // Update pagination when rows per page changes
  useEffect(() => {
    if (!mounted) return;

    if (!serverPagination) {
      setPagination((prev) => ({
        ...prev,
        pageSize: rowsPerPage,
        pageIndex: 0, // Reset to first page when changing page size
      }));
    } else {
      serverPagination.onPageSizeChange(rowsPerPage);
    }
  }, [rowsPerPage, serverPagination, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const updateVisiblePageButtons = () => {
    const maxButtons = 5;
    let buttons: (number | string)[] = [];

    if (totalPages <= maxButtons) {
      buttons = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      buttons.push(1);
      const leftSibling = Math.max(currentPage - 1, 2);
      const rightSibling = Math.min(currentPage + 1, totalPages - 1);

      if (leftSibling > 2) {
        buttons.push("...");
      }

      for (let i = leftSibling; i <= rightSibling; i++) {
        buttons.push(i);
      }

      if (rightSibling < totalPages - 1) {
        buttons.push("...");
      }

      buttons.push(totalPages);
    }

    setVisiblePageButtons(buttons);
  };

  const handleRowClick = (
    id: string | number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (!redirectUrl) return;

    if (event.target instanceof HTMLElement && event.target.tagName === "DIV") {
      return;
    }

    router.push("/" + redirectUrl + "/" + id);
  };

  const goToPage = (page: number) => {
    if (serverPagination) {
      serverPagination.onPageChange(page);
    } else {
      setPagination((prev) => ({
        ...prev,
        pageIndex: page - 1,
      }));
    }
  };

  // Calculate entry range information safely
  const startEntry =
    !mounted || filteredRows === 0
      ? 0
      : currentPage * (serverPagination?.pageSize || rowsPerPage) -
        (serverPagination?.pageSize || rowsPerPage) +
        1;

  const endEntry = !mounted
    ? 0
    : Math.min(
        currentPage * (serverPagination?.pageSize || rowsPerPage),
        filteredRows
      );

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value));

    // Page index is reset in the useEffect
  };

  // Function to clear date filters
  const clearDateFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  const canPreviousPage = !mounted
    ? false
    : serverPagination
    ? serverPagination.hasPreviousPage
    : table.getCanPreviousPage();

  const canNextPage = !mounted
    ? false
    : serverPagination
    ? serverPagination.hasNextPage
    : table.getCanNextPage();

  const handlePreviousPage = () => {
    if (canPreviousPage) {
      if (serverPagination) {
        serverPagination.onPageChange(currentPage - 1);
      } else {
        setPagination((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex - 1,
        }));
      }
    }
  };

  const handleNextPage = () => {
    if (canNextPage) {
      if (serverPagination) {
        serverPagination.onPageChange(currentPage + 1);
      } else {
        setPagination((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex + 1,
        }));
      }
    }
  };

  // Fix 5: Return a loading state or simplified view during server rendering
  if (!mounted) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="flex justify-center items-center space-x-2">
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "200ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "400ms" }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
        {/* Search bar */}
        {Array.isArray(searchKey) ? (
          <div className="flex gap-4">
            {searchKey.map((key) => (
              <Input
                key={key}
                placeholder={`Search ${key}`}
                value={(table.getColumn(key)?.getFilterValue() as string) ?? ""}
                onChange={(e) =>
                  table.getColumn(key)?.setFilterValue(e.target.value)
                }
                className="max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm dark:bg-[#8080804D]"
              />
            ))}
          </div>
        ) : (
          // Single input fallback
          <Input
            placeholder={`Search by ${searchKey}`}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn(searchKey)?.setFilterValue(e.target.value)
            }
            className="max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm dark:bg-[#8080804D]"
          />
        )}

        {/* Date filters - only shown if enableDateFilter is true */}
        {enableDateFilter && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium mb-1">From Date</span>
              <DatePicker
                className="w-full sm:w-[180px]"
                date={fromDate}
                setDate={setFromDate}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium mb-1">To Date</span>
              <DatePicker
                className="w-full sm:w-[180px]"
                date={toDate}
                setDate={setToDate}
              />
            </div>
            {(fromDate || toDate) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateFilters}
                  className="mt-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header with title, dropdown and action button */}
      <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] p-4 rounded-t-lg flex flex-col mb-0 border-t border-x border-[#00000033]">
        <div className="flex items-center space-x-2 justify-between">
          {title && <div>{title}</div>}
          {actionButton && <div>{actionButton}</div>}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 border-[#00000033] dark:border-[#0ABAB533] rounded-full mt-3 border">
            {mounted && (
              <Select
                value={
                  rowsPerPage === filteredRows ? "All" : rowsPerPage.toString()
                }
                onValueChange={handleRowsPerPageChange}
              >
                <SelectTrigger className="w-[4.5rem] h-8 border-none shadow-none bg-[#0ABAB533] dark:border-[#0ABAB533] rounded-full">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] border-x border-[#00000033] max-w-[calc(100vw-30px)] md:max-w-[calc(100vw-80px)] lg:max-w-full cursor-auto">
        <Table className="">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-black dark:text-[#B3A5C6] first:pl-5 last:pr-5 "
                    >
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-10 text-center border-y border-[#00000033]"
                >
                  <div className="flex justify-center items-center space-x-2">
                    <div
                      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                      style={{ animationDelay: "200ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                      style={{ animationDelay: "400ms" }}
                    ></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(event) => handleRowClick(row.original.id, event)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="first:pl-5 last:pr-5 border-y dark:border-[#FFFFFF33] border-[#00000033]"
                    >
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between py-4 px-4 bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] rounded-b-2xl border-x border-b border-[#00000033]">
        {/* Entry information */}
        <div className="text-sm px-1 font-medium">
          Showing {startEntry} to {endEntry} of {filteredRows} entries
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full  ${
              !canPreviousPage
                ? "bg-[#353535]  text-white cursor-not-allowed"
                : "bg-[#0ABAB5] hover:bg-[#089e99] transition-colors duration-200 cursor-pointer text-white"
            }`}
            onClick={handlePreviousPage}
          >
            <ChevronLeft size={16} />
          </div>

          <div className="flex items-center space-x-2">
            {visiblePageButtons.map((pageNumber, index) =>
              typeof pageNumber === "number" ? (
                <div
                  key={index}
                  className={`flex items-center justify-center w-8 h-8 cursor-pointer text-sm ${
                    pageNumber === currentPage
                      ? "bg-[#0ABAB5] text-white rounded-sm hover:bg-[#089e99] duration-200 transition-all"
                      : "hover:bg-gray-100 dark:hover:bg-gray-600 rounded-sm border border-black dark:border-[#B3A5C6]"
                  }`}
                  onClick={() => goToPage(pageNumber)}
                >
                  {pageNumber}
                </div>
              ) : (
                <div key={index} className="text-gray-500 px-1">
                  {pageNumber}
                </div>
              )
            )}
          </div>

          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full  ${
              !canNextPage
                ? "bg-[#353535] text-white cursor-not-allowed"
                : "bg-[#0ABAB5] hover:bg-[#089e99] cursor-pointer duration-200 text-white transition-colors"
            }`}
            onClick={handleNextPage}
          >
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
