"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";
import { ImagePreviewModal } from "@/components/Modal/ImagePreviewModal";
import { toast } from "react-toastify";
import { useState } from "react";
import Image from "next/image";

type Reaction = {
    id: number;
    emoji: string;
    marketId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
};

export type LiveTradeColumn = {
    id: number;
    title: string;
    description: string;
    imgUrl: string | null;
    reactionsCount: number;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
    reactions: Reaction[];
};

export type LiveTradeResponseColumn = {
    id: number;
    title: string;
    description: string | null;
    imgUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reaction: Reaction[];
    _count: {
        reaction: number;
        TradeViews: number;
    };
};

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
                        alt={title || "Live trade image"}
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
                    alt={title || "Live trade image"}
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
        </>
    );
};

export const columns: ColumnDef<LiveTradeColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
            const description = row.original.description || "-";
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
        cell: ({ row }) => (
            <ImageCell
                imgUrl={row.original.imgUrl}
                title={row.original.title}
            />
        ),
    },
    {
        accessorKey: "reactionsCount",
        header: "Reactions",
    },
    {
        accessorKey: "viewCount",
        header: "Views",
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];