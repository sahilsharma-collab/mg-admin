"use client";
import React, { useEffect, useState, useCallback } from "react";
import { columns, UserColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePagination } from "@/context/pagination-context";
import { DataTableWithApiPagination } from "@/components/ui/data-table2";
import { apiFetch, withQuery } from "@/lib/api";
import { toCsv } from "@/lib/csv";

// Update the interface to include raw date fields if not already present
export interface EnhancedUserColumn extends UserColumn {
  createdAtRaw: Date;
  updatedAtRaw: Date;
  emailVerified: boolean;
}

/**
 * Headers and readers for the users export, in file order.
 *
 * Kept as data rather than a template string so every field goes through
 * `toCsv`, which quotes it and neutralises spreadsheet formulas (see lib/csv.ts
 * — a display name is user-controlled and may be either a quoted mess or a
 * live `=HYPERLINK(...)` payload).
 */
const USER_CSV_COLUMNS = [
  ["ID", (u: EnhancedUserColumn) => u.id],
  ["Name", (u: EnhancedUserColumn) => u.name],
  ["Email", (u: EnhancedUserColumn) => u.email],
  ["Role", (u: EnhancedUserColumn) => u.role],
  ["Phone", (u: EnhancedUserColumn) => u.phone || ""],
  ["Exness ID", (u: EnhancedUserColumn) => u.exnessId || ""],
  ["Created At", (u: EnhancedUserColumn) => u.createdAt],
  ["Updated At", (u: EnhancedUserColumn) => u.updatedAt],
  ["Exness Verified", (u: EnhancedUserColumn) => u.exnessVerified],
  ["Email Verified", (u: EnhancedUserColumn) => u.emailVerified],
] as const;

/** The exact file the download button writes. Exported so tests can parse it. */
export function buildUsersCsv(
  users: readonly EnhancedUserColumn[]
): string {
  return toCsv([
    USER_CSV_COLUMNS.map(([header]) => header),
    ...users.map((user) => USER_CSV_COLUMNS.map(([, read]) => read(user))),
  ]);
}

const UserDataClient = () => {
  const [formattedUsers, setFormattedUsers] = useState<EnhancedUserColumn[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { page, limit, setPage, setLimit, resetPagination } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<string>("email"); // Default search field
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  // Handle initial loading only once
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        resetPagination();
        setIsInitialized(true);
      }
    };
    initialize();
  }, [isInitialized, resetPagination]);

  // Fetch data when pagination or search changes
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const path = withQuery("/api/profile/paginated/all", {
        page,
        limit,
        email: searchField === "email" ? searchQuery : null,
        exnessId: searchField === "exnessId" ? searchQuery : null,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await apiFetch(path, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        )}`;
      };

      const formattedData: EnhancedUserColumn[] = data.users.map(
        (user: EnhancedUserColumn) => ({
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
        })
      );

      setFormattedUsers(formattedData);
      setTotalUsers(data.pagination.totalUsers);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, searchField, dateRange]);

  useEffect(() => {
    if (isInitialized) {
      fetchUsers();
    }
  }, [fetchUsers, isInitialized, refreshCounter]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
  };

  const handleSearchFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchField(e.target.value);
    setPage(1); // Reset to first page when changing search field
    if (searchQuery) {
      // If there's an active search, refresh to apply with new field
      setRefreshCounter((prev) => prev + 1);
    }
  };

  // Add handlers for date filtering
  const handleDateChange = (
    type: "startDate" | "endDate",
    value: string | null
  ) => {
    setDateRange((prev) => ({
      ...prev,
      [type]: value,
    }));
    setPage(1); // Reset to first page when changing date filters
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setDateRange({ startDate: null, endDate: null });
    setPage(1);
  };

  const downloadCSV = () => {
    const csv = buildUsersCsv(formattedUsers);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `users_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnsWithActions = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: { row: Row<UserColumn> }) => (
          <CellAction data={row.original} onSuccess={refreshData} />
        ),
      };
    }
    return col;
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <div className="container-padding">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search field selector */}
        <select
          className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          value={searchField}
          onChange={handleSearchFieldChange}
        >
          <option value="email">Search by Email</option>
          <option value="exnessId">Search by Exness ID</option>
        </select>

        {/* Date filters */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">From:</label>
          <input
            type="date"
            className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            value={dateRange.startDate || ""}
            onChange={(e) =>
              handleDateChange("startDate", e.target.value || null)
            }
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm">To:</label>
          <input
            type="date"
            className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            value={dateRange.endDate || ""}
            onChange={(e) =>
              handleDateChange("endDate", e.target.value || null)
            }
          />
        </div>

        {/* Clear filters button */}
        {(searchQuery || dateRange.startDate || dateRange.endDate) && (
          <Button
            onClick={handleClearFilters}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTableWithApiPagination
        redirectUrl=""
        columns={columnsWithActions}
        data={formattedUsers}
        loading={loading}
        title={<h1 className="text-xl font-semibold">Users List</h1>}
        actionButton={
          <Button
            onClick={downloadCSV}
            className="bg-[#0ABAB5] rounded-full hover:bg-[#089e99] transition-colors dark:text-white"
          >
            <Download className="h-4 w-4 -mr-1" />
            Export
          </Button>
        }
        totalItems={totalUsers}
        totalPages={totalPages}
        currentPage={page}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleLimitChange}
        onSearch={handleSearch}
        searchPlaceholder={
          searchField === "email" ? "Search by email" : "Search by Exness ID"
        }
        enableDateFilter={false} // Set to false since we've implemented custom date filters above
      />
    </div>
  );
};

export default UserDataClient;
