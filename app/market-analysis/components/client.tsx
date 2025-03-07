"use client"
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, MarketAnalysisColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";

const MarketAnalysisClient = () => {
    const [formattedMarketAnalysis, setFormattedMarketAnalysis] = useState<MarketAnalysisColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchMarketAnalysis = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/market`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("Market Analysis Data:", data);

                const formatDateTime = (dateString: string) => {
                    const date = new Date(dateString);
                    const formattedDate = date.toLocaleDateString('en-US');
                    const formattedTime = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    return `${formattedDate} ${formattedTime}`;
                };

                const formattedData: MarketAnalysisColumn[] = data.marketAnalysis.map((analysis: MarketAnalysisColumn) => ({
                    id: analysis.id,
                    title: analysis.title,
                    description: analysis.description,
                    imgUrl: analysis.imgUrl,
                    createdAt: formatDateTime(analysis.createdAt),
                    updatedAt: formatDateTime(analysis.updatedAt),
                    reactions: analysis.reactions,
                }));

                setFormattedMarketAnalysis(formattedData);
            } catch (error) {
                console.error("Error fetching market analysis:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketAnalysis();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
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
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors"
                    >
                        Add Market Analysis
                    </Button>
                }
            />
        </div>
    );
};

export default MarketAnalysisClient;