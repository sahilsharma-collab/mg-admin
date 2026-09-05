"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import { columns, ModeratorColumn, ModeratorResponseColumn, } from './columns';
import { toast } from "react-toastify";
import { Row } from '@tanstack/react-table';
import { CellAction } from './cell-actions';
import { apiFetch } from "@/lib/api";

const ModeratorClient = () => {
    const [formattedModerators, setFormattedModerators] = useState<ModeratorColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/admin/moderators", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                const data = await response.json();

                const formatDateTime = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                };

                const formattedData: ModeratorColumn[] = data.users.map((moderator: ModeratorResponseColumn) => ({
                    id: moderator.id,
                    name: moderator.name,
                    email: moderator.email,
                    role: moderator.role,
                    createdAt: formatDateTime(moderator.createdAt),
                    updatedAt: formatDateTime(moderator.updatedAt),
                }));

                setFormattedModerators(formattedData);
            } catch (error) {
                console.error("Error fetching moderators:", error);
                toast.error("Failed to load moderators");
            } finally {
                setLoading(false);
            }
        };

        fetchAdmins();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithActions = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<ModeratorColumn> }) => (
                    <CellAction data={row.original} onSuccess={refreshData} />
                ),
            };
        }
        return col;
    });

    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey="email"
                columns={columnsWithActions}
                data={formattedModerators}
                loading={loading}
                title={
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold">Admin Management</h1>
                    </div>
                }
            />
        </div>
    );
};

export default ModeratorClient;