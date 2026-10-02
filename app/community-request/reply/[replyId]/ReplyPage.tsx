"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { api } from "@/lib/api";

interface ReplyReport {
    id: number;
    userId: number;
    replyId: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    reply: {
        id: number;
        content: string;
        imageUrl: string | null;
        author: {
            id: number;
            name: string;
            email: string;
        };
    };
}

const ReplyReportPage = ({ replyId }: { replyId: string }) => {
    const [report, setReport] = useState<ReplyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus] = useState("PENDING");
    const router = useRouter();

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const response = await api.get(
                    `/api/post/reply/report/${replyId}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.data.success) {
                    setReport(response.data.report);
                    setStatus(response.data.report.status);
                } else {
                    throw new Error("Failed to fetch report");
                }
            } catch (error) {
                console.error("Error fetching reply report:", error);
                toast.error("Failed to load reply report details");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [replyId]);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return format(date, 'MMM dd, yyyy h:mm a');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "text-yellow-600";
            case "APPROVED":
                return "text-green-600";
            case "REJECTED":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            setUpdating(true);

            const requestBody = {
                reportId: report?.id,
                status: newStatus,
                blockUser: true,
            };

            const response = await api.post(
                "/api/post/report/reply/handle",
                requestBody,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.data.success) {
                toast.success(`Status updated to ${newStatus}.`);
                router.push('/community-request/reply');
            } else {
                toast.error("Failed to update status.");
            }
        } catch (error) {
            toast.error("Failed to update status.");
            console.error(error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <section className="container-padding">
                <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                    <div className="flex space-x-2">
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "200ms" }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "400ms" }}
                        ></div>
                    </div>
                </div>
            </section>
        );
    }

    if (!report) {
        return (
            <section className="container-padding">
                <div className="text-center py-10">
                    <h2 className="text-xl font-medium">Reply report not found</h2>
                </div>
            </section>
        );
    }

    return (
        <section className="container-padding">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl my-3">Reply Report #{report.id}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {status}
                </span>
            </div>

            <article className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                <div className="grid grid-cols-1 gap-6">
                    {/* Report Details */}
                    <div className="space-y-6">
                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <h3 className="font-medium mb-2">Reported By</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Name:</span> {report.user.name}</p>
                                <p><span className="font-medium">Email:</span> {report.user.email}</p>
                            </div>
                        </div>

                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <h3 className="font-medium mb-2">Reported Reply</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium">Reply Author:</h4>
                                    <p>{report.reply.author.name} ({report.reply.author.email})</p>
                                </div>
                                <div>
                                    <h4 className="font-medium">Reply Content:</h4>
                                    <p className="whitespace-pre-line">{report.reply.content}</p>
                                </div>
                                {report.reply.imageUrl && (
                                    <div>
                                        <h4 className="font-medium mb-2">Reply Image</h4>
                                        <div className="relative w-full h-[30rem] rounded-md overflow-hidden">
                                            <Image
                                                src={report.reply.imageUrl}
                                                alt="Reported reply image"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                        <h3 className="font-medium mb-2">Details</h3>
                        <div className="space-y-2">
                            <p><span className="font-medium">Reported At:</span> {formatDateTime(report.createdAt)}</p>
                            <p><span className="font-medium">Last Updated:</span> {formatDateTime(report.updatedAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Status Update Form */}
                <div className="mt-8 space-y-6">
                    <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4 space-y-4">
                        <h3 className="font-medium">Update Report Status</h3>

                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <Select
                                value={status}
                                onValueChange={(value) => setStatus(value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">PENDING</SelectItem>
                                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            disabled={updating}
                            onClick={() => handleStatusChange(status)}
                            className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
                        >
                            {updating ? "Updating..." : "Update Status"}
                        </Button>
                    </div>
                </div>
            </article>
        </section>
    );
};

export default ReplyReportPage;