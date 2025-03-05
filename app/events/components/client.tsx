"use client";
import { DataTable } from "@/components/ui/data-table";
import React, { useEffect, useState } from "react";
import { columns, EventColumn } from "./columns";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';
import { CellAction } from "./cell-action";
import { Row } from "@tanstack/react-table";

const EventsClient = () => {
    const [formattedEvents, setFormattedEvents] = useState<EventColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/event`, {
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
                console.log("Event Data:", data);

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

                const formattedData: EventColumn[] = data.events.map((event: EventColumn) => ({
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    currencyPair: event.currencyPair,
                    date: formatDateTime(event.date),
                    imgUrl: event.imgUrl,
                    createdAt: formatDateTime(event.createdAt),
                }));

                setFormattedEvents(formattedData);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<EventColumn> }) => (
                    <CellAction data={row.original} onDelete={refreshData} />
                ),
            };
        }
        return col;
    });

    return (
        <div className="px-4 md:px-10 py-4 md:py-5">
            <DataTable
                redirectUrl=""
                searchKey="title"
                columns={columnsWithRefresh}
                data={formattedEvents}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Events List</h1>}
                actionButton={
                    <Button
                        onClick={() => router.push(`/events/new`)}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors"
                    >
                        Add Event
                    </Button>
                }
            />
        </div>
    );
};

export default EventsClient;