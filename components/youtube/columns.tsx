"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./CellAction";

export type YouTubeVideoColumn = {
  id: string;
  videoId: string;
};

const YouTubePlayer = ({ videoId }: { videoId: string }) => (
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

// Takes onDelete rather than exporting a ready-made array. The previous shape
// exported columns whose actions cell was wired to `onDelete={() => {}}`, and
// every caller then rebuilt that one column to inject a real refresh callback —
// so the exported cell was never the one rendered.
export const buildColumns = (
  onDelete: () => void,
): ColumnDef<YouTubeVideoColumn>[] => [
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
    cell: ({ row }) => <CellAction data={row.original} onDelete={onDelete} />,
  },
];
