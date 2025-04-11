"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Columns, ReferralRequestColumn, ReferralRequestResponse } from './columns';
import { Button } from '@/components/ui/button';
import { BulkUpdateModal } from './BulkUpdateModal';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';

// Update the interface to include raw date fields
export interface EnhancedReferralRequestColumn extends ReferralRequestColumn {
    createdAtRaw: Date;
    updatedAtRaw: Date;
}

const ReferralRequestClient = () => {
    const [formattedRequests, setFormattedRequests] = useState<EnhancedReferralRequestColumn[]>([]);
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

                const formattedData: EnhancedReferralRequestColumn[] = data.requests.map((request: ReferralRequestResponse) => ({
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
                    // Add raw date objects for filtering
                    createdAtRaw: new Date(request.createdAt),
                    updatedAtRaw: new Date(request.updatedAt),
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

    const downloadCSV = () => {
        // CSV header
        let csv = 'ID,User ID,Exness ID,Status,Created At,Updated At,User Name,User Email,User Exness ID,Exness Verified\n';

        // Add data rows
        formattedRequests.forEach(request => {
            csv += `"${request.id}","${request.userId}","${request.exnessId}","${request.status}","${request.createdAt}","${request.updatedAt}","${request.userName}","${request.userEmail}","${request.userExnessId}","${request.exnessVerified}"\n`;
        });

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `referral_requests_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey={["exnessId", "userEmail"]}
                columns={columnsWithRefresh}
                data={formattedRequests}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Referral Requests List</h1>}
                actionButton={
                    <>
                        <Button
                            onClick={downloadCSV}
                            className="bg-[#0ABAB5] hover:bg-[#089e99] transition-colors dark:text-white rounded-full"
                        >
                            <Download className="h-4 w-4 -mr-1" />
                            Export
                        </Button>
                        <Button
                            onClick={handleBulkUpdateClick}
                            className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white ml-2"
                        >
                            Bulk Update ({selectedRowIds.length})
                        </Button>
                    </>
                }
                enableDateFilter={true}
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