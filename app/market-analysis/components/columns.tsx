"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";

type Reaction = {
    id: number;
    emoji: string;
    marketId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
};

export type MarketAnalysisColumn = {
    id: number;
    title: string;
    description: string;
    imgUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reactions: Reaction[];
};

export const columns: ColumnDef<MarketAnalysisColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
            const description = row.original.description;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {description}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "imgUrl",
        header: "Image",
        cell: ({ row }) => {
            const imgUrl = row.original.imgUrl;
            return (
                <div className="relative h-6 w-8 rounded-md overflow-hidden">
                    {imgUrl ? (
                        <Image
                            src={imgUrl || "/Images/no-image.png"}
                            alt={row.original.title || "Event image"}
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
            );
        }
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];