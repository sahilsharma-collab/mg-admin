"use client"
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { columns, FAQColumn, FAQResponseColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

const FAQClient = () => {
    const [formattedFAQs, setFormattedFAQs] = useState<FAQColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchFAQs = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/faq", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("FAQ Data:", data);

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

                const formattedData: FAQColumn[] = data.faqs.map((faq: FAQResponseColumn) => ({
                    id: faq.id,
                    question: faq.question,
                    answer: faq.answer,
                    createdAt: formatDateTime(faq.createdAt),
                    updatedAt: formatDateTime(faq.updatedAt),
                    // Add raw date objects for filtering
                    createdAtRaw: new Date(faq.createdAt),
                    updatedAtRaw: new Date(faq.updatedAt),
                }));

                setFormattedFAQs(formattedData);
            } catch (error) {
                console.error("Error fetching FAQs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFAQs();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<FAQColumn> }) => (
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
                searchKey="question"
                columns={columnsWithRefresh}
                data={formattedFAQs}
                loading={loading}
                title={<h1 className="text-xl font-semibold">FAQ List</h1>}
                actionButton={
                    <Button
                        onClick={() => router.push(`/faq/new`)}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
                    >
                        Add New FAQ
                    </Button>
                }
            />
        </div>
    );
};

export default FAQClient;