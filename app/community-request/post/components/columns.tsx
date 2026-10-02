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
import { useState } from "react";
import { CellAction } from "./cell-actions";
import { api } from "@/lib/api";

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

    const handleStatusChange = async (newStatus: string) => {
        try {
            setIsUpdating(true);

            const requestBody = {
                reportId: rowData.id,
                status: newStatus,
                blockUser: true,
            };

            // Call the API to update the status
            const response = await api.post(
                "/api/post/report/handle",
                requestBody,
                {
                    headers: {
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
        header: ({ table }) => (
            <div className="flex items-center gap-2">
                <span>Status</span>
                <Select
                    value={(table.getColumn("status")?.getFilterValue() as string) ?? "ALL"}
                    onValueChange={(value) =>
                        table.getColumn("status")?.setFilterValue(
                            value === "ALL" ? undefined : value
                        )
                    }
                >
                    <SelectTrigger className="w-[110px] h-8 bg-white dark:bg-[#2E2941] border border-[#0000001A] dark:border-[#FFFFFF33] focus:ring-[0.1px] focus:ring-[#0ABAB5] focus:border-[#0ABAB5]">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#2E2941] border border-[#0000001A] dark:border-[#FFFFFF33]">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        ),
        cell: ({ row }) => {
            return (
                <StatusCell
                    value={row.original.status}
                    rowData={row.original}
                    refreshData={refreshData}
                />
            );
        },
        enableColumnFilter: true,
        filterFn: (row, id, value) => {
            if (!value || value === "ALL") return true;
            return row.getValue(id) === value;
        },
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];