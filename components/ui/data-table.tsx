"use client";

import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey: string;
    redirectUrl: string | null;
    title?: React.ReactNode;
    actionButton?: React.ReactNode;
    loading?: boolean;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    redirectUrl,
    title,
    actionButton,
    loading = false,
}: DataTableProps<TData, TValue>) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [visiblePageButtons, setVisiblePageButtons] = useState<(number | string)[]>([]);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
            pagination: {
                pageIndex: 0,
                pageSize: rowsPerPage,
            },
        },
    });

    const router = useRouter();
    const currentPage = table.getState().pagination.pageIndex + 1;
    const totalPages = table.getPageCount();
    const filteredRows = table.getFilteredRowModel().rows.length;

    useEffect(() => {
        updateVisiblePageButtons();
    }, [currentPage, totalPages]);

    useEffect(() => {
        table.setPageSize(rowsPerPage);
    }, [rowsPerPage, table]);

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
        table.setPageIndex(page - 1);
    };

    // Calculate entry range information
    const startEntry = filteredRows === 0
        ? 0
        : currentPage * rowsPerPage - rowsPerPage + 1;

    const endEntry = Math.min(currentPage * rowsPerPage, filteredRows);

    // Handle rows per page change
    const handleRowsPerPageChange = (value: string) => {
        if (value === "All") {
            setRowsPerPage(filteredRows);
        } else {
            setRowsPerPage(parseInt(value));
        }
        table.setPageIndex(0);
    };

    return (
        <div className="">
            {/* Original search bar at the top */}
            <div className="flex items-center py-4">
                <Input
                    placeholder={`Search by ${searchKey}`}
                    value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn(searchKey)?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm"
                />
            </div>

            {/* Header with title, dropdown and action button */}
            <div className="bg-[#DBE7F7] p-4 rounded-t-lg flex flex-col  mb-0 border-t border-x border-[#00000033]">
                <div className="flex items-center space-x-2 justify-between">
                    {title && <div>{title}</div>}
                    {actionButton && <div>{actionButton}</div>}
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 border-[#00000033] rounded-full mt-3 border">
                        <Select value={rowsPerPage === filteredRows ? "All" : rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                            <SelectTrigger className="w-[4.5rem] h-8 border-none shadow-none bg-[#0ABAB533] rounded-full">
                                <SelectValue placeholder="10" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="All">All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#DBE7F7] border-x border-[#00000033] max-w-[calc(100vw-30px)] md:max-w-[calc(100vw-80px)] lg:max-w-full">
                <Table className="">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="text-black first:pl-5 last:pr-5 ">
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
                                    // @ts-expect-error - `row.original.id` is expected to exist
                                    onClick={(event) => handleRowClick(row.original.id, event)}
                                    className="hover:cursor-pointer"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="first:pl-5 last:pr-5 border-y border-[#00000033]">
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
            <div className="flex items-center justify-between py-4 px-4 bg-[#DBE7F7] rounded-b-2xl border-x border-b border-[#00000033]">
                {/* Entry information */}
                <div className="text-sm px-1 font-medium">
                    Showing {startEntry} to {endEntry} of {filteredRows} entries
                </div>

                {/* Pagination controls */}
                <div className="flex items-center space-x-2">
                    <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full  ${!table.getCanPreviousPage() ? 'bg-[#353535] text-white cursor-not-allowed' : 'bg-[#0ABAB5] cursor-pointer text-white hover:opacity-90'
                            }`}
                        onClick={() => table.getCanPreviousPage() && table.previousPage()}
                    >
                        <ChevronLeft size={16} />
                    </div>

                    <div className="flex items-center space-x-2 mx-2">
                        {visiblePageButtons.map((pageNumber, index) =>
                            typeof pageNumber === 'number' ? (
                                <div
                                    key={index}
                                    className={`flex items-center justify-center w-8 h-8 cursor-pointer text-sm ${pageNumber === currentPage
                                        ? 'bg-[#0ABAB5] text-white rounded-sm'
                                        : 'hover:bg-gray-100 rounded-sm'
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
                        className={`flex items-center justify-center w-8 h-8 rounded-full  ${!table.getCanNextPage() ? 'bg-[#353535] text-white cursor-not-allowed' : 'bg-[#0ABAB5] cursor-pointer text-white hover:opacity-90'
                            }`}
                        onClick={() => table.getCanNextPage() && table.nextPage()}
                    >
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}