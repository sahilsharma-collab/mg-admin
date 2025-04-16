"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";

export type BlockedUserColumn = {
    id: number;
    name: string;
    email: string;
    role: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
    createdAtRaw: Date;
    updatedAtRaw: Date;
};

export interface BlockedUserResponse {
    id: number;
    name: string;
    email: string;
    role: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
}

export const columns: ColumnDef<BlockedUserColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const name = row.original.name;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {name}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
            const email = row.original.email;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {email}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.original.role;
            let bgColor = "";
            let textColor = "";

            switch (role) {
                case "ADMIN":
                    bgColor = "bg-purple-100";
                    textColor = "text-purple-800";
                    break;
                case "MODERATOR":
                    bgColor = "bg-blue-100";
                    textColor = "text-blue-800";
                    break;
                case "USER":
                    bgColor = "bg-green-100";
                    textColor = "text-green-800";
                    break;
                default:
                    bgColor = "bg-gray-100";
                    textColor = "text-gray-800";
            }

            return (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                >
                    {role}
                </span>
            );
        },
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "createdAt",
        header: "Date",
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onSuccess={() => { }} />,
    },
];