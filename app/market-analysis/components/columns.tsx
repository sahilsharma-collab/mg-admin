"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";
import { ImagePreviewModal } from "@/components/Modal/ImagePreviewModal";
import { useState } from "react";
import { toast } from "react-toastify";
import Image from "next/image";

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
    reactionCount: number;
    viewCount: number;
};

export interface MarketAnalysisResponseColumn {
    id: number;
    title: string;
    description: string | null;
    imgUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reaction: Reaction[];
    _count: {
        reaction: number;
        MarketViews: number;
    };
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
                        alt={title || "Market analysis image"}
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
                    alt={title || "Market analysis image"}
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
        </>
    );
};

export const columns: ColumnDef<MarketAnalysisColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
            const title = row.original.title;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[20rem] break-words whitespace-normal">
                                {title}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
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
        accessorKey: "reactionCount",
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