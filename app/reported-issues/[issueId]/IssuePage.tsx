"use client"; // Add this since we'll be using hooks

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { apiFetch } from "@/lib/api";

interface Issue {
    id: number;
    title: string;
    description: string;
    imgUrl: string;
    status: string;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

const statusUpdateSchema = z.object({
    status: z.enum(["PENDING", "RESOLVED", "REJECTED"]),
    remarks: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

const IssuePage = ({ issueId }: { issueId: string }) => {
    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<StatusUpdateFormData>({
        resolver: zodResolver(statusUpdateSchema),
        defaultValues: {
            status: "PENDING",
            remarks: "",
        },
    });

    const status = watch("status");
    const remarks = watch("remarks");

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                setLoading(true);
                const response = await apiFetch(
                    `/api/issue/${issueId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                const data = await response.json();
                setIssue(data.issue);
                // Set form values from fetched issue
                setValue("status", data.issue.status);
                setValue("remarks", data.issue.remarks || "");
            } catch (error) {
                console.error("Error fetching issue:", error);
                toast.error("Failed to load issue details");
            } finally {
                setLoading(false);
            }
        };

        fetchIssue();
    }, [issueId, setValue]);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return format(date, 'MMM dd, yyyy h:mm a');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "bg-yellow-100 text-yellow-800";
            case "RESOLVED":
                return "bg-green-100 text-green-800";
            case "REJECTED":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const handleStatusUpdate = async (data: StatusUpdateFormData) => {
        try {
            setUpdating(true);
            const response = await apiFetch(
                `/api/issue/${issueId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status: data.status,
                        remarks: data.remarks,
                    }),
                }
            );

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            toast.success("Issue status updated successfully");

            // Refetch the issue to get updated data
            const fetchResponse = await apiFetch(
                `/api/issue/${issueId}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!fetchResponse.ok) throw new Error(`Error: ${fetchResponse.statusText}`);

            const updatedData = await fetchResponse.json();
            setIssue(updatedData.issue);
        } catch (error) {
            console.error("Error updating issue:", error);
            toast.error("Failed to update issue status");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <section className="container-padding">
                <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]"
                >
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

    if (!issue) {
        return (
            <section className="container-padding">
                <div className="text-center py-10">
                    <h2 className="text-xl font-medium">Issue not found</h2>
                </div>
            </section>
        );
    }

    return (
        <section className="container-padding">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl my-3">{issue.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.status)}`}>
                    {issue.status}
                </span>
            </div>

            <article className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                <div className="grid grid-cols-1 gap-6">
                    {/* Issue Details */}
                    <div className="space-y-6">
                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <h3 className="font-medium mb-2">Reported By</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Name:</span> {issue.user.name}</p>
                                <p><span className="font-medium">Email:</span> {issue.user.email}</p>
                            </div>
                        </div>

                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <h3 className="font-medium mb-2">Description</h3>
                            <p className="whitespace-pre-line">{issue.description}</p>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="space-y-6">
                        {issue.imgUrl && (
                            <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                                <h3 className="font-medium mb-2">Screenshot</h3>
                                <div className="relative w-full h-[30rem] rounded-md overflow-hidden">
                                    <Image
                                        src={issue.imgUrl}
                                        alt="Issue screenshot"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <h3 className="font-medium mb-2">Details</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Reported:</span> {formatDateTime(issue.createdAt)}</p>
                                <p>
                                    <span className="font-medium">Remarks:</span> {issue.remarks || "No remarks yet"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Update Form */}
                <form onSubmit={handleSubmit(handleStatusUpdate)} className="mt-8 space-y-6">
                    <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4 space-y-4">
                        <h3 className="font-medium">Update Status</h3>

                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <Select
                                value={status}
                                onValueChange={(value) => setValue("status", value as "PENDING" | "RESOLVED" | "REJECTED")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">PENDING</SelectItem>
                                    <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && (
                                <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Remarks</label>
                            <Textarea
                                {...register("remarks")}
                                value={remarks}
                                onChange={(e) => setValue("remarks", e.target.value)}
                                placeholder="Add remarks (optional)"
                                className="min-h-[100px]"
                            />
                            {errors.remarks && (
                                <p className="text-red-500 text-sm mt-1">{errors.remarks.message}</p>
                            )}
                        </div>

                        <Button
                            disabled={updating}
                            className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
                            type="submit"
                        >
                            {updating ? "Updating..." : "Update Status"}
                        </Button>
                    </div>
                </form>
            </article>
        </section>
    );
};

export default IssuePage;