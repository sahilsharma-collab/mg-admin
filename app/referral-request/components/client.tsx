"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Columns, ReferralRequestColumn, ReferralRequestResponse } from './columns';
import { Button } from '@/components/ui/button';
import { BulkUpdateModal } from './BulkUpdateModal';
import { toast } from 'react-toastify';

const ReferralRequestClient = () => {
    const [formattedRequests, setFormattedRequests] = useState<ReferralRequestColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

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
    }, [refreshCounter, token]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
        // Clear selected rows after refresh
        setSelectedRowIds([]);
    };

    const handleBulkUpdateClick = () => {
        if (selectedRowIds.length === 0) {
            toast.warn("Please select at least one row for bulk update.");
            return;
        }
        setIsBulkUpdateModalOpen(true);
    };

    const handleBulkUpdateSuccess = () => {
        // Clear selected rows after successful bulk update
        setSelectedRowIds([]);
        setIsBulkUpdateModalOpen(false);
        refreshData();
    };

    const columnsWithRefresh = Columns(refreshData, selectedRowIds, setSelectedRowIds);

    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey="exnessId"
                columns={columnsWithRefresh}
                data={formattedRequests}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Referral Requests List</h1>}
                actionButton={
                    <Button
                        onClick={handleBulkUpdateClick}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
                    >
                        Bulk Update ({selectedRowIds.length})
                    </Button>
                }
            />

            <BulkUpdateModal
                isOpen={isBulkUpdateModalOpen}
                onClose={() => setIsBulkUpdateModalOpen(false)}
                selectedIds={selectedRowIds}
                refreshData={refreshData}
                onSuccess={handleBulkUpdateSuccess}
            />
        </div>
    );
};

export default ReferralRequestClient;