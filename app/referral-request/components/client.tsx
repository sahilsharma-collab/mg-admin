"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import {  Columns, ReferralRequestColumn, ReferralRequestResponse } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";

const ReferralRequestClient = () => {
    const [formattedRequests, setFormattedRequests] = useState<ReferralRequestColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/exness/`, {
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
                console.log("Referral Requests Data:", data);

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

                const formattedData: ReferralRequestColumn[] = data.requests.map((request: ReferralRequestResponse) => ({
                    id: request.id,
                    userId: request.userId,
                    exnessId: request.exnessId,
                    status: request.status,
                    createdAt: formatDateTime(request.createdAt),
                    updatedAt: formatDateTime(request.updatedAt),
                    userName: request.user.name,
                    userEmail: request.user.email,
                    userExnessId: request.user.exnessId,
                    exnessVerified: request.user.exnessVerified,
                }));

                setFormattedRequests(formattedData);
            } catch (error) {
                console.error("Error fetching referral requests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = Columns(refreshData).map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<ReferralRequestColumn> }) => (
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
                searchKey="exnessId"
                columns={columnsWithRefresh}
                data={formattedRequests}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Referral Requests List</h1>}
            />
        </div>
    );
};

export default ReferralRequestClient;