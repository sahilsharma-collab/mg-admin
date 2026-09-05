"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import { columns, AdminColumn, AdminResponseColumn } from './columns';
import { toast } from "react-toastify";
import { CellAction } from './cell-actions';
import { Row } from '@tanstack/react-table';
import { apiFetch } from "@/lib/api";

const AdminClient = () => {
    const [formattedAdmins, setFormattedAdmins] = useState<AdminColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/admin/get-all", {
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

                const formattedData: AdminColumn[] = data.users.map((admin: AdminResponseColumn) => ({
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    createdAt: formatDateTime(admin.createdAt),
                    updatedAt: formatDateTime(admin.updatedAt),
                }));

                setFormattedAdmins(formattedData);
            } catch (error) {
                console.error("Error fetching admins:", error);
                toast.error("Failed to load admins");
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
                cell: ({ row }: { row: Row<AdminColumn> }) => (
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
                data={formattedAdmins}
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

export default AdminClient;