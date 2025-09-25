"use client";
import React, { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import {
  Columns,
  ReferralRequestColumn,
  ReferralRequestResponse,
} from "./columns";
import { Button } from "@/components/ui/button";
import { BulkUpdateModal } from "./BulkUpdateModal";
import { toast } from "react-toastify";
import { Download } from "lucide-react";
import { usePagination } from "@/context/pagination-context";
import { DataTableWithApiPagination } from "@/components/ui/data-table2";

// Update the interface to include raw date fields
export interface EnhancedReferralRequestColumn extends ReferralRequestColumn {
  createdAtRaw: Date;
  updatedAtRaw: Date;
}

const ReferralRequestClient = () => {
  const [formattedRequests, setFormattedRequests] = useState<
    EnhancedReferralRequestColumn[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const token = Cookies.get("auth_token");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const { page, limit, setPage, setLimit, resetPagination } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<string>("userEmail"); // Default search field
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const [status, setStatus] = useState<string>("");

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
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_PROD_URL}/api/exness/`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      // Add search parameters if query exists
      if (searchQuery) {
        if (searchField === "userEmail") {
          url.searchParams.append("userEmail", searchQuery);
        } else if (searchField === "exnessId") {
          url.searchParams.append("exnessId", searchQuery);
        }
      }

      if (status) {
        url.searchParams.append("status", status);
      }

      // Add date range parameters if they exist
      if (dateRange.startDate) {
        url.searchParams.append("startDate", dateRange.startDate);
      }
      if (dateRange.endDate) {
        url.searchParams.append("endDate", dateRange.endDate);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

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

      const formattedData: EnhancedReferralRequestColumn[] = data.requests.map(
        (request: ReferralRequestResponse) => ({
          id: request.id,
          userId: request.userId,
          exnessId: request.exnessId,
          status: request.status,
          createdAt: formatDateTime(request.createdAt),
          updatedAt: formatDateTime(request.updatedAt),
          userName: request.user.name,
          userEmail: request.user.email,
          userExnessId: request.user.exnessId,
          exnessVerified: request.user.exnessVerified,
          // Add raw date objects for filtering
          createdAtRaw: new Date(request.createdAt),
          updatedAtRaw: new Date(request.updatedAt),
          broker: request.broker,
        })
      );

      setFormattedRequests(formattedData);
      setTotalRequests(data.pagination.totalCount);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching referral requests:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, searchField, dateRange, token, status]);

  useEffect(() => {
    if (isInitialized) {
      fetchRequests();
    }
  }, [fetchRequests, isInitialized, refreshCounter]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
    // Clear selected rows after refresh
    setSelectedRowIds([]);
  };

  const handleBulkUpdateClick = () => {
    if (selectedRowIds.length === 0) {
      toast.warn("Please select at least one row for bulk update.");
      return;
    }
    setIsBulkUpdateModalOpen(true);
  };

  const handleBulkUpdateSuccess = () => {
    // Clear selected rows after successful bulk update
    setSelectedRowIds([]);
    setIsBulkUpdateModalOpen(false);
    refreshData();
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const columnsWithRefresh = Columns(
    refreshData,
    selectedRowIds,
    setSelectedRowIds,
    setStatus
  );

  const downloadCSV = () => {
    // CSV header
    let csv =
      "ID,User ID,Exness ID,Status,Created At,Updated At,User Name,User Email,User Exness ID,Exness Verified\n";

    // Add data rows
    formattedRequests.forEach((request) => {
      csv += `"${request.id}","${request.userId}","${request.exnessId}","${request.status}","${request.createdAt}","${request.updatedAt}","${request.userName}","${request.userEmail}","${request.userExnessId}","${request.exnessVerified}"\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `referral_requests_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <option value="userEmail">Search by Email</option>
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
        columns={columnsWithRefresh}
        data={formattedRequests}
        loading={loading}
        title={
          <h1 className="text-xl font-semibold">Referral Requests List</h1>
        }
        actionButton={
          <>
            <Button
              onClick={downloadCSV}
              className="bg-[#0ABAB5] hover:bg-[#089e99] transition-colors dark:text-white rounded-full"
            >
              <Download className="h-4 w-4 -mr-1" />
              Export
            </Button>
            <Button
              onClick={handleBulkUpdateClick}
              className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white ml-2"
            >
              Bulk Update ({selectedRowIds.length})
            </Button>
          </>
        }
        totalItems={totalRequests}
        totalPages={totalPages}
        currentPage={page}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleLimitChange}
        onSearch={handleSearch}
        searchPlaceholder={
          searchField === "userEmail"
            ? "Search by email"
            : "Search by Exness ID"
        }
        enableDateFilter={false} // Set to false since we've implemented custom date filters above
        setStatus={setStatus}
      />

      <BulkUpdateModal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => setIsBulkUpdateModalOpen(false)}
        selectedIds={selectedRowIds}
        refreshData={refreshData}
        onSuccess={handleBulkUpdateSuccess}
      />
    </div>
  );
};

export default ReferralRequestClient;
