"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { columns, LiveTradeColumn, LiveTradeResponseColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [warmingUp, setWarmingUp] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [acuStatus, setAcuStatus] = useState<{
    minCapacity: number;
    maxCapacity: number;
    status: string;
    isScaledUp: boolean;
  } | null>(null);
  const [acuLoading, setAcuLoading] = useState(true);

  const fetchACUStatus = useCallback(async () => {
    try {
      setAcuLoading(true);
      const response = await apiFetch(
        "/api/acu-status",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setAcuStatus(data);
    } catch (error) {
      console.error("Error fetching ACU status:", error);
    } finally {
      setAcuLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchACUStatus();
  }, [fetchACUStatus]);

  const handleWarmup = async () => {
    try {
      setWarmingUp(true);
      const response = await apiFetch(
        "/api/warm-db",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      toast.success("Database warmup successful!");
      fetchACUStatus();
    } catch (error) {
      console.error("Error warming up database:", error);
      toast.error("Failed to warm up database");
    } finally {
      setWarmingUp(false);
    }
  };

  const handleCooldown = async () => {
    try {
      setCoolingDown(true);
      const response = await apiFetch(
        "/api/cool-db",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      toast.success("Database cooldown successful!");
      fetchACUStatus();
    } catch (error) {
      console.error("Error cooling down database:", error);
      toast.error("Failed to cool down database");
    } finally {
      setCoolingDown(false);
    }
  };

  const fetchLiveTrades = useCallback(
    async (page: number, limit: number) => {
      try {
        setLoading(true);
        const response = await apiFetch(
          `/api/trade?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

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

        const formattedData: LiveTradeColumn[] = data.LiveTrade.map(
          (trade: LiveTradeResponseColumn) => {
            // Calculate total reactions from grouped reaction counts
            const totalReactions = trade.reactionCounts
              ? Object.values(trade.reactionCounts).reduce(
                  (sum: number, count: number) => sum + count,
                  0,
                )
              : 0;

            return {
              id: trade.id,
              title: trade.title?.slice(0, 30) + "...",
              description: trade.description,
              imgUrl: trade.imgUrl,
              reactionsCount: totalReactions,
              viewCount: trade._count?.TradeViews || 0,
              createdAt: formatDateTime(trade.createdAt),
              updatedAt: formatDateTime(trade.updatedAt),
              reactions: trade.reaction || [],
              createdAtRaw: new Date(trade.createdAt),
              updatedAtRaw: new Date(trade.updatedAt),
              impressionCount: trade.impressionCount || 0,
            };
          },
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
    [],
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
          <div className="flex items-center gap-4">
            {/* ACU Status Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              {acuLoading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : acuStatus ? (
                <>
                  <span className="text-sm font-medium">
                    ACU: {acuStatus.minCapacity}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      acuStatus.isScaledUp
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {acuStatus.isScaledUp ? "Scaled Up" : "Scaled Down"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">
                  Status unavailable
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleWarmup}
                disabled={warmingUp}
                className="bg-orange-500 rounded-full px-6 hover:bg-orange-600 transition-colors dark:text-white"
              >
                {warmingUp ? "Warming up..." : "Warmup DB"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={coolingDown}
                    className="bg-blue-500 rounded-full px-6 hover:bg-blue-600 transition-colors dark:text-white"
                  >
                    {coolingDown ? "Cooling down..." : "Cooldown DB"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to scale down the database capacity?
                      This may affect performance during active traffic.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600 hover:!text-white"
                      onClick={handleCooldown}
                    >
                      Yes, Cooldown
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={() => router.push(`/live-trade/new`)}
                className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
              >
                Add Live Trade
              </Button>
            </div>
          </div>
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
