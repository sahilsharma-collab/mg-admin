"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { columns, LiveTradeColumn, LiveTradeResponseColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const LiveTradeClient = () => {
  const [formattedLiveTrade, setFormattedLiveTrade] = useState<
    LiveTradeColumn[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const router = useRouter();
  const token = Cookies.get("auth_token");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLiveTrades = useCallback(
    async (page: number, limit: number) => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/trade?page=${page}&limit=${limit}`,
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

        const data = await response.json();
        console.log("Live Trade Data:", data);

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

        const formattedData: LiveTradeColumn[] = data.LiveTrade.map(
          (trade: LiveTradeResponseColumn) => ({
            id: trade.id,
            title: trade.title?.slice(0, 30) + "...",
            description: trade.description,
            imgUrl: trade.imgUrl,
            reactionsCount: trade._count?.reaction || 0,
            viewCount: trade._count?.TradeViews || 0,
            createdAt: formatDateTime(trade.createdAt),
            updatedAt: formatDateTime(trade.updatedAt),
            reactions: trade.reaction,
            createdAtRaw: new Date(trade.createdAt),
            updatedAtRaw: new Date(trade.updatedAt),
            impressionCount: trade.impressionCount || 0,
          })
        );

        setFormattedLiveTrade(formattedData);

        // Set pagination info from server response
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching live trade:", error);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchLiveTrades(currentPage, pageSize);
  }, [currentPage, pageSize, refreshCounter, fetchLiveTrades]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const columnsWithRefresh = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: { row: Row<LiveTradeColumn> }) => (
          <CellAction data={row.original} onDelete={refreshData} />
        ),
      };
    }
    return col;
  });

  return (
    <div className="container-padding">
      <DataTable
        redirectUrl=""
        searchKey="title"
        columns={columnsWithRefresh}
        data={formattedLiveTrade}
        loading={loading}
        title={<h1 className="text-xl font-semibold">Live Trade List</h1>}
        actionButton={
          <Button
            onClick={() => router.push(`/live-trade/new`)}
            className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
          >
            Add Live Trade
          </Button>
        }
        enableDateFilter={true}
        // Server-side pagination props
        serverSidePagination={true}
        paginationInfo={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default LiveTradeClient;
