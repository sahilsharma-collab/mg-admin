"use client";

import { useState, useEffect, useCallback } from "react";
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
import Cookies from "js-cookie";

// Add date filter custom type to allow filtering based on raw date objects
interface DateFilterableData {
    createdAtRaw?: Date;
    updatedAtRaw?: Date;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}
interface SearchConfig {
    apiPath: string; // e.g., "/api/profile/search"
    placeholder: string;
    searchKey?: string; // The query parameter name (defaults to "query")
}
interface DataTableProps<TData extends DateFilterableData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    // searchKey: string | string[];
    redirectUrl: string | null;
    title?: React.ReactNode;
    actionButton?: React.ReactNode;
    loading?: boolean;
    enableDateFilter?: boolean;
    onDateFilterChange?: (filteredData: TData[]) => void;
    totalItems?: number;
    totalPages?: number;
    currentPage?: number;
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
    onItemsPerPageChange?: (limit: number) => void;
    searchConfig?: SearchConfig;
}

export function DataTableWithApiPagination<TData extends DateFilterableData, TValue>({
    columns,
    data,
    // searchKey,
    redirectUrl,
    title,
    actionButton,
    loading = false,
    enableDateFilter = false,
    onDateFilterChange,
    totalItems = 0,
    totalPages = 1,
    currentPage = 1,
    itemsPerPage = 10,
    onPageChange,
    onItemsPerPageChange,
    searchConfig,  // Destructure the new prop
}: DataTableProps<TData, TValue>) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [visiblePageButtons, setVisiblePageButtons] = useState<(number | string)[]>([]);
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);
    const [filteredData, setFilteredData] = useState<TData[]>(data);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchLoading, setSearchLoading] = useState<boolean>(false);
    const token = Cookies.get("auth_token");

    // Debounce function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debounce = (func: (...args: any[]) => void, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };

    // API search function
    const performSearch = useCallback(async (query: string) => {
        if (!searchConfig || !query.trim()) {
            // If no search config or empty query, reset to normal data
            setFilteredData(data);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        try {
            const searchKey = searchConfig.searchKey || "query";
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_PROD_URL}${searchConfig.apiPath}?page=1&limit=${itemsPerPage}&${searchKey}=${encodeURIComponent(query)}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const searchData = await response.json();

            // Format the data to match your table structure
            // Note: You might want to make this formatting function configurable too
            const formatDateTime = (dateString: string) => {
                const date = new Date(dateString);
                const formattedDate = date.toLocaleDateString("en-US");
                const formattedTime = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });
                return `${formattedDate} ${formattedTime}`;
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedResults = searchData.users.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                exnessId: user.exnessId || "",
                createdAt: formatDateTime(user.createdAt),
                updatedAt: formatDateTime(user.updatedAt),
                exnessVerified: user.exnessVerified || false,
                emailVerified: user.emailVerified || false,
                createdAtRaw: new Date(user.createdAt),
                updatedAtRaw: new Date(user.updatedAt),
            }));

            setFilteredData(formattedResults);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setSearchLoading(false);
        }
    }, [token, itemsPerPage, searchConfig, data]);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            performSearch(query);
        }, 500),
        [performSearch]
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    // Apply date filtering when dates change
    useEffect(() => {
        if (enableDateFilter) {
            let dateFilteredData = [...data];

            if (fromDate) {
                // Set time to start of day
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);

                dateFilteredData = dateFilteredData.filter(item =>
                    item.createdAtRaw && item.createdAtRaw >= from
                );
            }

            if (toDate) {
                // Set time to end of day
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);

                dateFilteredData = dateFilteredData.filter(item =>
                    item.createdAtRaw && item.createdAtRaw <= to
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
    }, [fromDate, toDate, data, enableDateFilter, onDateFilterChange]);

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        manualPagination: true,
        state: {
            columnFilters,
        },
    });

    const router = useRouter();
    const filteredRows = table.getFilteredRowModel().rows.length;

    useEffect(() => {
        updateVisiblePageButtons();
    }, [currentPage, totalPages]);

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
                buttons.push('...');
            }

            for (let i = leftSibling; i <= rightSibling; i++) {
                buttons.push(i);
            }

            if (rightSibling < totalPages - 1) {
                buttons.push('...');
            }

            buttons.push(totalPages);
        }

        setVisiblePageButtons(buttons);
    };

    const handleRowClick = (id: string | number, event: React.MouseEvent<HTMLElement>) => {
        if (!redirectUrl) return;

        if (event.target instanceof HTMLElement && event.target.tagName === "DIV") {
            return;
        }

        router.push("/" + redirectUrl + "/" + id);
    };

    const goToPage = (page: number) => {
        if (onPageChange) {
            onPageChange(page);
        }
    };

    // Calculate entry range information
    const startEntry = totalItems === 0
        ? 0
        : (currentPage - 1) * itemsPerPage + 1;

    const endEntry = Math.min(currentPage * itemsPerPage, totalItems);

    // Handle rows per page change
    const handleRowsPerPageChange = (value: string) => {
        if (onItemsPerPageChange) {
            if (value === "All") {
                onItemsPerPageChange(totalItems);
            } else {
                onItemsPerPageChange(parseInt(value));
            }
        }
    };

    // Function to clear date filters
    const clearDateFilters = () => {
        setFromDate(undefined);
        setToDate(undefined);
    };

    return (
        <div className="">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
                {/* Search bar */}
                {/* Search bar - only shown if searchConfig is provided */}
                {searchConfig && (
                    <Input
                        placeholder={searchConfig.placeholder}
                        value={searchQuery}
                        onChange={handleSearchChange}
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
                        <Select value={itemsPerPage === totalItems ? "All" : itemsPerPage.toString()} onValueChange={handleRowsPerPageChange}>     <SelectTrigger className="w-[4.5rem] h-8 border-none shadow-none bg-[#0ABAB533] dark:border-[#0ABAB533] rounded-full">
                            <SelectValue placeholder="10" />
                        </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                {/* <SelectItem value="All">All</SelectItem> */}
                            </SelectContent>
                        </Select>
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
                                        <TableHead key={header.id} className="text-black dark:text-[#B3A5C6] first:pl-5 last:pr-5 ">
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
                        {loading || searchLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-10 text-center border-y border-[#00000033]">
                                    <div className="flex justify-center items-center space-x-2">
                                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
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
                                        <TableCell key={cell.id} className="first:pl-5 last:pr-5 border-y dark:border-[#FFFFFF33] border-[#00000033]">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
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
                        className={`flex items-center justify-center w-8 h-8 rounded-full  ${currentPage === 1 ? 'bg-[#353535]  text-white cursor-not-allowed' : 'bg-[#0ABAB5] hover:bg-[#089e99] transition-colors duration-200 cursor-pointer text-white'}`}
                        onClick={() => {
                            if (currentPage > 1) {
                                onPageChange?.(currentPage - 1);
                            }
                        }}
                    >
                        <ChevronLeft size={16} />
                    </div>

                    <div className="flex items-center space-x-2">
                        {visiblePageButtons.map((pageNumber, index) =>
                            typeof pageNumber === 'number' ? (
                                <div
                                    key={index}
                                    className={`flex items-center justify-center w-8 h-8 cursor-pointer text-sm ${pageNumber === currentPage
                                        ? 'bg-[#0ABAB5] text-white rounded-sm hover:bg-[#089e99] duration-200 transition-all'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-600 rounded-sm border border-black dark:border-[#B3A5C6]'
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
                        className={`flex items-center justify-center w-8 h-8 rounded-full  ${currentPage === totalPages ? 'bg-[#353535] text-white cursor-not-allowed' : 'bg-[#0ABAB5] hover:bg-[#089e99] cursor-pointer duration-200 text-white transition-colors'}`}
                        onClick={() => {
                            if (currentPage < totalPages) {
                                onPageChange?.(currentPage + 1);
                            }
                        }}
                    >
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}