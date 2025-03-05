"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import Image from "next/image";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type EventColumn = {
    id: number;
    title: string;
    description: string;
    date: string;
    currencyPair: string;
    imgUrl: string;
    createdAt: string;
};

export const columns: ColumnDef<EventColumn>[] = [
    // {
    //     accessorKey: "id",
    //     header: "ID",
    // },
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
        header: "Country Flag",
        cell: ({ row }) => {
            const imgUrl = row.original.imgUrl;
            return (
                <div className="relative h-6 w-8 rounded-md overflow-hidden">
                    {imgUrl ? (
                        <Image
                            src={imgUrl}
                            alt={row.original.title || "Event image"}
                            fill
                            className="object-cover"
                            sizes="48px"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gray-100">
                            <span className="text-gray-400 text-xs">No image</span>
                        </div>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: "currencyPair",
        header: "Currency Pair",
    },
    {
        accessorKey: "date",
        header: "Event Date",
    },
    // {
    //     accessorKey: "createdAt",
    //     header: "Created Date",
    // },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];