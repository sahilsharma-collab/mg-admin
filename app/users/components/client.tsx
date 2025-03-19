"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, UserColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";

const UserDataClient = () => {
    const [formattedUsers, setFormattedUsers] = useState<UserColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/profile/all`, {
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
                console.log("Users Data:", data);

                const formattedData: UserColumn[] = data.users.map((user: UserColumn) => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }));

                setFormattedUsers(formattedData);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<UserColumn> }) => (
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
                searchKey="email"
                columns={columnsWithRefresh}
                data={formattedUsers}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Users List</h1>}
            />
        </div>
    );
};

export default UserDataClient;