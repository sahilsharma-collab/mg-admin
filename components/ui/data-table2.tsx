"use client";
import { useState, useCallback } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
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

interface DateFilterableData {
  createdAtRaw?: Date;
  updatedAtRaw?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface DataTableProps<TData extends DateFilterableData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  redirectUrl: string | null;
  title?: React.ReactNode;
  actionButton?: React.ReactNode;
  loading?: boolean;
  enableDateFilter?: boolean;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  setStatus?: (status: string) => void;
  setMethod?: (method: string) => void;
}

export function DataTableWithApiPagination<
  TData extends DateFilterableData,
  TValue
>({
  columns,
  data,
  redirectUrl,
  title,
  actionButton,
  loading = false,
  enableDateFilter = false,
  totalItems = 0,
  totalPages = 1,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  onSearch,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Calculate pagination display values
  const startEntry =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate visible page buttons
  const getVisiblePageButtons = () => {
    const maxButtons = 5;
    const buttons: (number | string)[] = [];

    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    buttons.push(1);
    const leftSibling = Math.max(currentPage - 1, 2);
    const rightSibling = Math.min(currentPage + 1, totalPages - 1);

    if (leftSibling > 2) buttons.push("...");
    for (let i = leftSibling; i <= rightSibling; i++) buttons.push(i);
    if (rightSibling < totalPages - 1) buttons.push("...");
    buttons.push(totalPages);

    return buttons;
  };

  const visiblePageButtons = getVisiblePageButtons();

  // Debounced search handler
  const debouncedSearch = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (func: any, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    },
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(() => {
      if (onSearch) {
        onSearch(query);
        if (onPageChange) onPageChange(1);
      }
    }, 500)(query);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    state: { columnFilters },
  });

  const handleRowClick = (
    id: string | number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (!redirectUrl || (event.target as HTMLElement).tagName === "DIV") return;
    router.push(`/${redirectUrl}/${id}`);
  };

  const handleRowsPerPageChange = (value: string) => {
    if (!onItemsPerPageChange) return;
    onItemsPerPageChange(value === "All" ? totalItems : parseInt(value));
  };

  const clearDateFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
        {onSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm dark:bg-[#8080804D]"
          />
        )}

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

      <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] p-4 rounded-t-lg flex flex-col mb-0 border-t border-x border-[#00000033]">
        <div className="flex items-center space-x-2 justify-between">
          {title && <div>{title}</div>}
          {actionButton && <div>{actionButton}</div>}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 border-[#00000033] dark:border-[#0ABAB533] rounded-full mt-3 border">
            <Select
              value={
                itemsPerPage === totalItems ? "All" : itemsPerPage.toString()
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
          </div>
        </div>
      </div>

      <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] border-x border-[#00000033] max-w-[calc(100vw-30px)] md:max-w-[calc(100vw-80px)] lg:max-w-full cursor-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-black dark:text-[#B3A5C6] first:pl-5 last:pr-5"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
                    />
                    <div
                      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                      style={{ animationDelay: "200ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                      style={{ animationDelay: "400ms" }}
                    />
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

      <div className="flex items-center justify-between py-4 px-4 bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] rounded-b-2xl border-x border-b border-[#00000033]">
        <div className="text-sm px-1 font-medium">
          Showing {startEntry} to {endEntry} of {totalItems} entries
        </div>

        <div className="flex items-center space-x-2">
          <button
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentPage === 1
                ? "bg-[#353535] text-white cursor-not-allowed"
                : "bg-[#0ABAB5] hover:bg-[#089e99] transition-colors duration-200 cursor-pointer text-white"
            }`}
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center space-x-2">
            {visiblePageButtons.map((pageNumber, index) =>
              typeof pageNumber === "number" ? (
                <button
                  key={index}
                  className={`flex items-center justify-center w-8 h-8 cursor-pointer text-sm ${
                    pageNumber === currentPage
                      ? "bg-[#0ABAB5] text-white rounded-sm hover:bg-[#089e99] duration-200 transition-all"
                      : "hover:bg-gray-100 dark:hover:bg-gray-600 rounded-sm border border-black dark:border-[#B3A5C6]"
                  }`}
                  onClick={() => onPageChange?.(pageNumber)}
                >
                  {pageNumber}
                </button>
              ) : (
                <span key={index} className="text-gray-500 px-1">
                  {pageNumber}
                </span>
              )
            )}
          </div>

          <button
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentPage === totalPages
                ? "bg-[#353535] text-white cursor-not-allowed"
                : "bg-[#0ABAB5] hover:bg-[#089e99] cursor-pointer duration-200 text-white transition-colors"
            }`}
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
