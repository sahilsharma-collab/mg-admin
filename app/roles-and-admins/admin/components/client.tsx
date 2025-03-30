"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, AdminColumn, AdminResponseColumn } from './columns';
import { toast } from "react-toastify";

const AdminClient = () => {
    const [formattedAdmins, setFormattedAdmins] = useState<AdminColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/admin/get-all`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
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
    }, [token]);



    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey="email"
                columns={columns}
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