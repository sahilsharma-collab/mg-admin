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
        PostView: number;
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
    viewCount:number;
    reactions: ReactionCount[];
    myReaction: Reaction | null;
};

// Separate component for the author avatar
const AuthorAvatarCell = ({ author, authorImageUrl }: {
    author: string,
    authorImageUrl: string | null
}) => {
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
};

// Separate component for the post image
const PostImageCell = ({ imgUrl, title }: {
    imgUrl: string | null,
    title: string
}) => {
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
                        alt={title || "Community post image"}
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
                    alt={title || "Community post image"}
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
        </>
    );
};

export const columns: ColumnDef<CommunityPostColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[15rem] truncate">
                            {row.original.title}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
        accessorKey: "content",
        header: "Content",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[15rem] truncate">
                            {row.original.content}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
        accessorKey: "author",
        header: "Author",
        cell: ({ row }) => (
            <AuthorAvatarCell
                author={row.original.author}
                authorImageUrl={row.original.authorImageUrl}
            />
        )
    },
    {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => (
            <PostImageCell
                imgUrl={row.original.imageUrl}
                title={row.original.title}
            />
        )
    },
    {
        accessorKey: "reactionsCount",
        header: "Reactions",
    },
    {
        accessorKey: "repliesCount",
        header: "Replies",
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