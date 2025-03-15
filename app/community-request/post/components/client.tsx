"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, ReferralRequestColumn, ReferralRequestResponse } from './columns';

const ReferralRequestClient = () => {
    const [formattedRequests, setFormattedRequests] = useState<ReferralRequestColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);

                // Make a POST request to the new API endpoint
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/post/report`, {
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
                console.log("Report Data:", data);

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

                // Map the new response structure to ReferralRequestColumn
                const formattedData: ReferralRequestColumn[] = data.reports.map((report: ReferralRequestResponse) => ({
                    id: report.id,
                    userId: report.userId,
                    postId: report.postId,
                    status: report.status,
                    createdAt: formatDateTime(report.createdAt),
                    updatedAt: formatDateTime(report.updatedAt),
                    userName: report.user.name,
                    userEmail: report.user.email,
                    postTitle: report.post.title,
                    postContent: report.post.content,
                    postImageUrl: report.post.imageUrl,
                }));

                setFormattedRequests(formattedData);
            } catch (error) {
                console.error("Error fetching reports:", error);
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
                searchKey="postTitle"
                columns={columnsWithRefresh}
                data={formattedRequests}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Reported Posts List</h1>}
            />
        </div>
    );
};

export default ReferralRequestClient;