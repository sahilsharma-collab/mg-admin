"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, ReferralReplyColumn, ReferralReplyResponse } from './columns';

const ReferralReplyClient = () => {
    const [formattedRequests, setFormattedRequests] = useState<ReferralReplyColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);

                // Make a GET request to the new API endpoint
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/post/reply/report`, {
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
                console.log("Reply Report Data:", data);

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

                // Map the new response structure to ReferralReplyColumn
                const formattedData: ReferralReplyColumn[] = data.reports.map((report: ReferralReplyResponse) => ({
                    id: report.id,
                    userId: report.userId,
                    replyId: report.replyId,
                    status: report.status,
                    createdAt: formatDateTime(report.createdAt),
                    updatedAt: formatDateTime(report.updatedAt),
                    userName: report.user.name,
                    userEmail: report.user.email,
                    replyContent: report.reply.content,
                    replyImageUrl: report.reply.imageUrl,
                }));

                setFormattedRequests(formattedData);
            } catch (error) {
                console.error("Error fetching reply reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns(refreshData);

    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey="replyContent"
                columns={columnsWithRefresh}
                data={formattedRequests}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Reported Replies List</h1>}
            />
        </div>
    );
};

export default ReferralReplyClient;