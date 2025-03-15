"use client";

import { ColumnDef } from "@tanstack/react-table";
// import { CellAction } from "./cell-actions";
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
    exnessId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
        exnessId: string;
        exnessVerified: boolean;
    };
}

export type ReferralRequestColumn = {
    id: number;
    userId: number;
    exnessId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    userName: string;
    userEmail: string;
    userExnessId: string;
    exnessVerified: boolean;
};

// Create a separate component for the status cell
const StatusCell = ({ value, userId, refreshData }: { 
    value: string, 
    userId: number, 
    refreshData: () => void 
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const token = Cookies.get('auth_token');

    const handleStatusChange = async (newStatus: string) => {
        try {
            setIsUpdating(true);
            // Call the API to update the status
            await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/exness/verify?userId=${userId}`,
                // { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            toast.success(`Status updated to ${newStatus}.`);
            refreshData();
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

export const Columns = (refreshData: () => void): ColumnDef<ReferralRequestColumn>[] => [
    {
        accessorKey: "exnessId",
        header: "Exness ID",
    },
    {
        accessorKey: "userName",
        header: "User Name",
    },
    {
        accessorKey: "userEmail",
        header: "User Email",
    },
    {
        accessorKey: "userExnessId",
        header: "User Exness ID",
    },
    {
        accessorKey: "exnessVerified",
        header: "Exness Verified",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            return (
                <StatusCell 
                    value={row.original.status}
                    userId={row.original.userId}
                    refreshData={refreshData}
                />
            );
        },
    },
];