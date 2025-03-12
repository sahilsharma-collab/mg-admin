"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";

type Reaction = {
    id: number;
    emoji: string;
    postId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
};

type ReactionCount = {
    emoji: string;
    count: number;
};

export interface PostResponse {
    id: number;
    title: string;
    content: string;
    imageUrl: string | null;
    author: {
      userName: string;
      imgUrl: string | null;
    };
    createdAt: string;
    updatedAt: string;
    _count: {
      reactions: number;
      replies: number;
    };
    reactions: ReactionCount[]; 
    myReaction: Reaction | null;
  }

export type CommunityPostColumn = {
    id: number;
    title: string;
    content: string;
    imageUrl: string | null;
    author: string;
    authorImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reactionsCount: number;
    repliesCount: number;
    reactions: ReactionCount[];
    myReaction: Reaction | null;
};

export const columns: ColumnDef<CommunityPostColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
            const content = row.original.title;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {content}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "content",
        header: "Content",
        cell: ({ row }) => {
            const content = row.original.content;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[15rem] truncate">
                                {content}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "author",
        header: "Author",
        cell: ({ row }) => {
            const author = row.original.author;
            const authorImageUrl = row.original.authorImageUrl;
            return (
                <div className="flex items-center gap-2">
                    {authorImageUrl ? (
                        <div className="relative h-6 w-6 rounded-full overflow-hidden">
                            <Image
                                src={authorImageUrl}
                                alt={author}
                                fill
                                className="object-cover"
                                sizes="24px"
                            />
                        </div>
                    ) : (
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                                {author.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <span>{author}</span>
                </div>
            );
        }
    },
    {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => {
            const imageUrl = row.original.imageUrl;
            return (
                <div className="relative h-6 w-8 rounded-md overflow-hidden">
                    {imageUrl ? (
                        <Image
                            src={imageUrl || "/Images/no-image.png"}
                            alt={row.original.title || "Post image"}
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
    // {
    //     accessorKey: "createdAt",
    //     header: "Created At",
    // },
    {
        accessorKey: "reactionsCount",
        header: "Reactions",
    },
    {
        accessorKey: "repliesCount",
        header: "Replies",
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];