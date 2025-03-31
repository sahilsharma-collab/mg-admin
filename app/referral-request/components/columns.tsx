"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    isSelected?: boolean;
};

const StatusCell = ({
    value,
    requestId,
    refreshData
}: {
    value: string,
    requestId: number,
    refreshData: () => void
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const token = Cookies.get('auth_token');

    const handleStatusChange = async (newStatus: string) => {
        try {
            setIsUpdating(true);
            await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/exness/verify`,
                {
                    requestId: requestId,
                    status: newStatus
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            toast.success(`Status updated to ${newStatus}`);
            refreshData();
        } catch (error) {
            toast.error("Failed to update status");
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

export const Columns = (
    refreshData: () => void,
    selectedRowIds: number[],
    setSelectedRowIds: (ids: number[]) => void
): ColumnDef<ReferralRequestColumn>[] => [
        {
            id: "select",
            header: ({ table }) => {
                const pageRowIds = table.getRowModel().rows.map(row => row.original.id);
                const allPageRowsSelected = pageRowIds.every(id => selectedRowIds.includes(id));

                return (
                    <Checkbox
                        checked={allPageRowsSelected && pageRowIds.length > 0}
                        indeterminate={
                            selectedRowIds.some(id => pageRowIds.includes(id)) &&
                            !allPageRowsSelected
                        }
                        onCheckedChange={(value) => {
                            table.toggleAllPageRowsSelected(!!value);
                            if (!!value) {
                                // Add all page row IDs to selected rows
                                setSelectedRowIds([...new Set([...selectedRowIds, ...pageRowIds])]);
                            } else {
                                // Remove current page row IDs from selected rows
                                setSelectedRowIds(selectedRowIds.filter(id => !pageRowIds.includes(id)));
                            }
                        }}
                        aria-label="Select all"
                        className="translate-y-[2px]"
                    />
                );
            },
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedRowIds.includes(row.original.id)}
                    onCheckedChange={(value) => {
                        row.toggleSelected(!!value);
                        if (!!value) {
                            setSelectedRowIds([...new Set([...selectedRowIds, row.original.id])]);
                        } else {
                            setSelectedRowIds(selectedRowIds.filter(id => id !== row.original.id));
                        }
                    }}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
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
        // {
        //     accessorKey: "userExnessId",
        //     header: "User Exness ID",
        // },
        {
            accessorKey: "exnessVerified",
            header: "Exness Verified",
            cell: ({ row }) => (
                <div className="capitalize">
                    {row.original.exnessVerified ? "Verified" : "Not Verified"}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <StatusCell
                    value={row.original.status}
                    requestId={row.original.id}
                    refreshData={refreshData}
                />
            ),
        }
    ];