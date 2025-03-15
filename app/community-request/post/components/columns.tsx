"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import axios from "axios";
import { useState } from "react";
import Cookies from 'js-cookie';

export interface ReferralRequestResponse {
    id: number;
    userId: number;
    postId: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    post: {
        id: number;
        title: string;
        content: string;
        imageUrl: string | null;
    };
}

export type ReferralRequestColumn = {
    id: number;
    userId: number;
    postId: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    userName: string;
    userEmail: string;
    postTitle: string;
    postContent: string;
    postImageUrl: string | null;
};

// Create a separate component for the status cell
const StatusCell = ({ value, rowData, refreshData }: { 
    value: string, 
    rowData: ReferralRequestColumn, 
    refreshData: () => void 
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const token = Cookies.get('auth_token');

    const handleStatusChange = async (newStatus: string) => {
        try {
            setIsUpdating(true);

            const requestBody = {
                reportId: rowData.id,
                status: newStatus,
                blockUser: true,
            };

            // Call the API to update the status
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/report/handle`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.data.success) {
                toast.success(`Status updated to ${newStatus}.`);
                refreshData();
            } else {
                toast.error("Failed to update status.");
            }
        } catch (error) {
            toast.error("Failed to update status.");
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    let statusColor = "";
    switch (value) {
        case "PENDING":
            statusColor = "text-yellow-600";
            break;
        case "APPROVED":
            statusColor = "text-green-600";
            break;
        case "REJECTED":
            statusColor = "text-red-600";
            break;
        default:
            statusColor = "text-gray-600";
    }

    return (
        <Select
            value={value}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
        >
            <SelectTrigger className={`w-[8rem] h-8 border-none shadow-none rounded-full ${statusColor}`}>
                <SelectValue placeholder={value} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="PENDING" className="text-yellow-600">
                    PENDING
                </SelectItem>
                <SelectItem value="APPROVED" className="text-green-600">
                    APPROVED
                </SelectItem>
                <SelectItem value="REJECTED" className="text-red-600">
                    REJECTED
                </SelectItem>
            </SelectContent>
        </Select>
    );
};

export const columns = (refreshData: () => void): ColumnDef<ReferralRequestColumn>[] => [
    {
        accessorKey: "postTitle",
        header: "Post Title",
        cell: ({ row }) => {
            const postTitle = row.original.postTitle;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {postTitle}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        },
    },
    {
        accessorKey: "postContent",
        header: "Post Content",
        cell: ({ row }) => {
            const postContent = row.original.postContent;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {postContent}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        },
    },
    {
        accessorKey: "userName",
        header: "Reported By",
    },
    {
        accessorKey: "userEmail",
        header: "Reported By",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            return (
                <StatusCell 
                    value={row.original.status} 
                    rowData={row.original} 
                    refreshData={refreshData} 
                />
            );
        },
    },
];