"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";
import { ImagePreviewModal } from "@/components/Modal/ImagePreviewModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface IssueResponseColumn {
    id: number;
    title: string;
    description: string;
    imgUrl: string;
    userId: number;
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

export interface IssueColumn {
    id: number;
    title: string;
    description: string;
    image: string;
    userName: string;
    userEmail: string;
    status: string;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
    createdAtRaw: Date;
    updatedAtRaw: Date;
}

// Separate component for the image cell
const ImageCell = ({ imgUrl, title }: { imgUrl: string | null, title: string }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleImageClick = () => {
        if (imgUrl) {
            setIsPreviewOpen(true);
        } else {
            toast.error("Image does not exist for preview");
        }
    };

    return (
        <>
            <div
                className="relative h-6 w-8 rounded-md overflow-hidden cursor-pointer"
                onClick={handleImageClick}
            >
                {imgUrl ? (
                    <Image
                        src={imgUrl}
                        alt={title || "Issue screenshot"}
                        fill
                        className="object-cover"
                        sizes="48px"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full w-full">
                        <span className="text-xs">N/A</span>
                    </div>
                )}
            </div>

            {imgUrl && (
                <ImagePreviewModal
                    imgUrl={imgUrl}
                    alt={title || "Issue screenshot"}
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
        </>
    );
};

export const columns: ColumnDef<IssueColumn>[] = [
    {
        accessorKey: "title",
        accessorFn: row => row.title,
        header: "Title",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[10rem] truncate">
                            {row.original.title}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        ),
    },
    {
        accessorKey: "image",
        header: "Screenshot",
        cell: ({ row }) => (
            <ImageCell
                imgUrl={row.original.image}
                title={row.original.title}
            />
        ),
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
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        ),
        cell: ({ row }) => {
            const status = row.original.status;
            let statusClass = "";

            switch (status) {
                case "PENDING":
                    statusClass = "bg-yellow-100 text-yellow-800";
                    break;
                case "RESOLVED":
                    statusClass = "bg-green-100 text-green-800";
                    break;
                case "REJECTED":
                    statusClass = "bg-red-100 text-red-800";
                    break;
                default:
                    statusClass = "bg-gray-100 text-gray-800";
            }

            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                    {status}
                </span>
            );
        },
        enableColumnFilter: true,
        filterFn: (row, id, value) => {
            if (!value || value === "ALL") return true;
            return row.getValue(id) === value;
        },
    },
    {
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[8rem] truncate">
                            {row.original.remarks || "-"}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "Date",
    },
    {
        id: "actions",
        // cell: ({ row }) => <div className="flex justify-end">{row.original.id}</div>,
    },
];