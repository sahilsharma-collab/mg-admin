"use client"
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { columns, EventCategoryColumn, EventCategoryResponseColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

const EventCategoryClient = () => {
    const [formattedEventCategories, setFormattedEventCategories] = useState<EventCategoryColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchEventCategories = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/event/category", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();

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

                const formattedData: EventCategoryColumn[] = data.eventCategory.map((category: EventCategoryResponseColumn) => ({
                    id: category.id,
                    title: category.name,
                    description: category.description,
                    imgUrl: category.imgUrl,
                    currencyPair: category.currencyPair,
                    createdAt: formatDateTime(category.createdAt),
                    updatedAt: formatDateTime(category.updatedAt),
                }));

                setFormattedEventCategories(formattedData);
            } catch (error) {
                console.error("Error fetching event categories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEventCategories();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<EventCategoryColumn> }) => (
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
                data={formattedEventCategories}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Event Categories</h1>}
                actionButton={
                    <Button
                        onClick={() => router.push(`/events/event-category/new`)}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
                    >
                        Add Event Category
                    </Button>
                }
            />
        </div>
    );
};

export default EventCategoryClient;