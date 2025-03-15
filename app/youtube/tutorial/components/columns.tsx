"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-actions";

export type YouTubeVideoColumn = {
    id: string;
    videoId: string;
};

// Component to play the YouTube video
const YouTubePlayer = ({ videoId }: { videoId: string }) => {
    return (
        <div className="aspect-video w-full max-w-md">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
            ></iframe>
        </div>
    );
};

export const columns: ColumnDef<YouTubeVideoColumn>[] = [
    {
        accessorKey: "videoId",
        header: "Video ID",
    },
    {
        id: "video",
        header: "Video",
        cell: ({ row }) => <YouTubePlayer videoId={row.original.videoId} />,
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];