"use client";
import React, { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { columns, PaymentWithUser } from "./columns";
// import { CellAction } from "./cell-actions";
// import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePagination } from "@/context/pagination-context";
import { DataTableWithApiPagination } from "@/components/ui/data-table2";

// Update the interface to include raw date fields if not already present

const UserDataClient = () => {
  const [formattedUsers, setFormattedUsers] = useState<PaymentWithUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const token = Cookies.get("auth_token");
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

  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  // Status options with display and API value mapping
  const statusOptions = [
    { display: "All Status", value: "" },
    { display: "SUCCESS", value: "SUCCESS" },
    { display: "PENDING", value: "PENDING" },
    { display: "FAILED", value: "FAILED" },
  ];

  // Method options with display and API value mapping
  const methodOptions = [
    { display: "All Methods", value: "" },
    { display: "UPI", value: "UPI" },
    { display: "CRYPTO", value: "CRYPTO" },
  ];

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
      const url = new URL(`${process.env.NEXT_PUBLIC_VIP_URL}/api/payment`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      // Add search parameters if query exists
      if (searchQuery) {
        if (searchField === "email") {
          url.searchParams.append("email", searchQuery);
        } else if (searchField === "orderId") {
          url.searchParams.append("orderId", searchQuery);
        }
      }

      // Add payment status and method if they are set
      if (paymentStatus) {
        url.searchParams.append("status", paymentStatus);
      }
      if (paymentMethod) {
        url.searchParams.append("paymentMethod", paymentMethod);
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

      const formatDateTime = (dateString: string | Date) => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedData: PaymentWithUser[] = data.payments.map(
        (payment: PaymentWithUser) => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          cregisId: payment.cregisId,
          amountPaid: payment.amountPaid,
          epayId: payment.epayId,
          telegramLink: payment.telegramLink,
          description: payment.description,
          createdAt: formatDateTime(payment.createdAt),
          updatedAt: formatDateTime(payment.updatedAt),
          user: {
            id: payment.user.id,
            name: payment.user.name,
            email: payment.user.email,
            phoneNumber: payment.user.phoneNumber,
            country: payment.user.country,
          },
          package: {
            id: payment.package.id,
          },
        })
      );

      setFormattedUsers(formattedData);
      setTotalUsers(data.pagination.totalPayments);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    searchQuery,
    searchField,
    dateRange,
    paymentStatus,
    paymentMethod,
    token,
  ]);

  useEffect(() => {
    if (isInitialized) {
      fetchUsers();
    }
  }, [fetchUsers, isInitialized, refreshCounter]);

  // const refreshData = () => {
  //   setRefreshCounter((prev) => prev + 1);
  // };

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

  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPaymentStatus(e.target.value);
    setPage(1); // Reset to first page when changing status
  };

  // Handle method change
  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPaymentMethod(e.target.value);
    setPage(1); // Reset to first page when changing method
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setDateRange({ startDate: null, endDate: null });
    setPaymentStatus("");
    setPaymentMethod("");
    setPage(1);
  };

  const downloadCSV = () => {
    let csv =
      "id,amount,currency,paymentMethod,status,cregisId,amountPaid,epayId,telegramLink,description,createdAt,updatedAt,user.id,user.name,user.email,user.phoneNumber,user.country,package.id\n";
    formattedUsers.forEach((user) => {
      csv += `"${user.id}","${user.amount}","${user.currency}","${
        user.paymentMethod
      }","${user.status || ""}","${user.cregisId || ""}","${
        user.amountPaid || ""
      }","${user.epayId || ""}","${user.telegramLink || ""}","${
        user.description || ""
      }","${user.createdAt}","${user.updatedAt}","${user.user.id}","${
        user.user.name
      }","${user.user.email}","${user.user.phoneNumber}","${
        user.user.country
      }","${user.package.id}"\n`;
    });

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
        // cell: ({ row }: { row: Row<PaymentWithUser> }) => (
        //   <CellAction data={row.original} onSuccess={refreshData} />
        // ),
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
          <option value="orderId">Search by Order ID</option>
        </select>

        {/* Status filter */}
        <select
          className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          value={paymentStatus}
          onChange={handleStatusChange}
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.display}
            </option>
          ))}
        </select>

        {/* Method filter */}
        <select
          className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          value={paymentMethod}
          onChange={handleMethodChange}
        >
          {methodOptions.map((method) => (
            <option key={method.value} value={method.value}>
              {method.display}
            </option>
          ))}
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
        {(searchQuery ||
          dateRange.startDate ||
          dateRange.endDate ||
          paymentStatus ||
          paymentMethod) && (
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
        title={
          <h1 className="text-xl font-semibold">
            Payments {totalUsers > 0 ? `(${totalUsers})` : ""}
          </h1>
        }
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
          searchField === "email" ? "Search by email" : "Search by Order ID"
        }
        enableDateFilter={false} // Set to false since we've implemented custom date filters above
        setStatus={setPaymentStatus}
        setMethod={setPaymentMethod}
      />
    </div>
  );
};

export default UserDataClient;
