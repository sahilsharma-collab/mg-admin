"use client"
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import { columns, BlockedUserColumn, BlockedUserResponse } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

const BlockedUsersClient = () => {
    const [formattedUsers, setFormattedUsers] = useState<BlockedUserColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchBlockedUsers = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/profile/blocked", {
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

                const formattedData: BlockedUserColumn[] = data.users.map((user: BlockedUserResponse) => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    createdAt: formatDateTime(user.createdAt),
                    updatedAt: formatDateTime(user.updatedAt),
                    // Add raw date objects for filtering
                    createdAtRaw: new Date(user.createdAt),
                    updatedAtRaw: new Date(user.updatedAt),
                }));

                setFormattedUsers(formattedData);
            } catch (error) {
                console.error("Error fetching blocked users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlockedUsers();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<BlockedUserColumn> }) => (
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
                searchKey="name"
                columns={columnsWithRefresh}
                data={formattedUsers}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Blocked Users</h1>}
                enableDateFilter={true}
            />
        </div>
    );
};

export default BlockedUsersClient;