"use client";
import React, { useEffect, useState, useCallback } from "react";
import { columns, PaymentWithUser } from "./columns";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePagination } from "@/context/pagination-context";
import { DataTableWithApiPagination } from "@/components/ui/data-table2";
import { vipFetch, withQuery } from "@/lib/api";

const RenewalsDataClient = () => {
  const [formattedRenewals, setFormattedRenewals] = useState<PaymentWithUser[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRenewals, setTotalRenewals] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { page, limit, setPage, setLimit, resetPagination } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const [paymentMethod, setPaymentMethod] = useState<string>("");

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
  const fetchRenewals = useCallback(async () => {
    try {
      setLoading(true);
      const path = withQuery("/api/payment/renewals", {
        page,
        limit,
        email: searchQuery,
        paymentMethod,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await vipFetch(path, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
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

      // Format the data
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
          utmSource: payment.utmSource || null,
          user: {
            id: payment.user.id,
            name: payment.user.name,
            email: payment.user.email,
            phoneNumber: payment.user.phoneNumber,
            country: payment.user.country,
          },
          package: payment.package,
        })
      );

      setFormattedRenewals(formattedData);
      setTotalRenewals(data.pagination.totalPayments);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching renewals:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, dateRange, paymentMethod]);

  useEffect(() => {
    if (isInitialized) {
      fetchRenewals();
    }
  }, [fetchRenewals, isInitialized]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
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
    setPaymentMethod("");
    setPage(1);
  };

  const downloadCSV = () => {
    let csv =
      "id,amount,currency,paymentMethod,status,cregisId,amountPaid,telegramLink,description,createdAt,updatedAt,utmSource,user.id,user.name,user.email,user.phoneNumber,user.country,package.id,package.name,package.duration\n";
    formattedRenewals.forEach((renewal) => {
      csv += `"${renewal.id}","${renewal.amount}","${renewal.currency}","${
        renewal.paymentMethod
      }","${renewal.status}","${renewal.cregisId || ""}","${
        renewal.amountPaid || ""
      }","${renewal.telegramLink || ""}","${renewal.description || ""}","${
        renewal.createdAt
      }","${renewal.updatedAt}","${renewal.utmSource || ""}","${
        renewal.user.id
      }","${renewal.user.name}","${renewal.user.email}","${
        renewal.user.phoneNumber
      }","${renewal.user.country}","${renewal.package.id}","${
        renewal.package.name
      }","${renewal.package.duration}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `renewals_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        {/* Method filter */}
        {/* <select
          className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          value={paymentMethod}
          onChange={handleMethodChange}
        >
          {methodOptions.map((method) => (
            <option key={method.value} value={method.value}>
              {method.display}
            </option>
          ))}
        </select> */}

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
        columns={columns}
        data={formattedRenewals}
        loading={loading}
        title={
          <h1 className="text-xl font-semibold">
            Renewals {totalRenewals > 0 ? `(${totalRenewals})` : ""}
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
        totalItems={totalRenewals}
        totalPages={totalPages}
        currentPage={page}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleLimitChange}
        onSearch={handleSearch}
        searchPlaceholder="Search by email"
        enableDateFilter={false} // Set to false since we've implemented custom date filters above
        setMethod={setPaymentMethod}
      />
    </div>
  );
};

export default RenewalsDataClient;
