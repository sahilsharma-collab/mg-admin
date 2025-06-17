"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { columns, LiveTradeColumn, LiveTradeResponseColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";

const LiveTradeClient = () => {
  const [formattedLiveTrade, setFormattedLiveTrade] = useState<
    LiveTradeColumn[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const token = Cookies.get("auth_token");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchMarketAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/trade`,
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
            reactionsCount: trade._count.reaction,
            viewCount: trade._count.TradeViews,
            createdAt: formatDateTime(trade.createdAt),
            updatedAt: formatDateTime(trade.updatedAt),
            reactions: trade.reaction,
            createdAtRaw: new Date(trade.createdAt),
            updatedAtRaw: new Date(trade.updatedAt),
            impressionCount: trade.impressionCount,
          })
        );

        setFormattedLiveTrade(formattedData);
      } catch (error) {
        console.error("Error fetching live trade:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketAnalysis();
  }, [refreshCounter]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
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
      />
    </div>
  );
};

export default LiveTradeClient;
