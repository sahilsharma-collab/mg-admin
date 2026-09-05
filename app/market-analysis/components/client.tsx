"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import {
  columns,
  MarketAnalysisColumn,
  MarketAnalysisResponseColumn,
} from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const MarketAnalysisClient = () => {
  const [formattedMarketAnalysis, setFormattedMarketAnalysis] = useState<
    MarketAnalysisColumn[]
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

  const fetchMarketAnalysis = useCallback(
    async (page: number, limit: number) => {
      try {
        setLoading(true);
        const response = await apiFetch(
          `/api/market?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Market Analysis Data:", data);

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

        const formattedData: MarketAnalysisColumn[] = data.marketAnalysis.map(
          (analysis: MarketAnalysisResponseColumn) => {
            // Calculate total reactions from grouped reaction counts
            const totalReactions = analysis.reactionCounts
              ? Object.values(analysis.reactionCounts).reduce(
                  (sum: number, count: number) => sum + count,
                  0
                )
              : analysis._count?.reaction || 0;

            return {
              id: analysis.id,
              title: analysis.title,
              description: analysis.description,
              imgUrl: analysis.imgUrl,
              createdAt: formatDateTime(analysis.createdAt),
              updatedAt: formatDateTime(analysis.updatedAt),
              reactions: analysis.reaction || [],
              reactionCount: totalReactions,
              viewCount: analysis._count?.MarketViews || 0,
              // Add raw date objects for filtering
              createdAtRaw: new Date(analysis.createdAt),
              updatedAtRaw: new Date(analysis.updatedAt),
              impressionCount: analysis.impressionCount || 0,
            };
          }
        );

        setFormattedMarketAnalysis(formattedData);

        // Set pagination info from server response
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching market analysis:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMarketAnalysis(currentPage, pageSize);
  }, [currentPage, pageSize, refreshCounter, fetchMarketAnalysis]);

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
        cell: ({ row }: { row: Row<MarketAnalysisColumn> }) => (
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
        data={formattedMarketAnalysis}
        loading={loading}
        title={<h1 className="text-xl font-semibold">Market Analysis List</h1>}
        actionButton={
          <Button
            onClick={() => router.push(`/market-analysis/new`)}
            className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
          >
            Add Market Analysis
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

export default MarketAnalysisClient;
