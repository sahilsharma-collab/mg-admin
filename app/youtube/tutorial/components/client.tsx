"use client";
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { columns, YouTubeVideoColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

const YouTubeTutorialClient = () => {
    const [formattedVideos, setFormattedVideos] = useState<YouTubeVideoColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchYouTubeVideos = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/video/tutorial", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("YouTube Videos Data:", data);

                const formattedData: YouTubeVideoColumn[] = data.videos.map((video: YouTubeVideoColumn) => ({
                    id: video.id,
                    videoId: video.videoId,
                }));

                setFormattedVideos(formattedData);
            } catch (error) {
                console.error("Error fetching YouTube videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchYouTubeVideos();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<YouTubeVideoColumn> }) => (
                    <CellAction data={row.original} onDelete={refreshData} />
                ),
            };
        }
        return col;
    });

    return (
        <div className="container-padding">
            <DataTable
                redirectUrl=""
                searchKey="videoId"
                columns={columnsWithRefresh}
                data={formattedVideos}
                loading={loading}
                title={<h1 className="text-xl font-semibold">YouTube Videos List</h1>}
                actionButton={
                    <Button
                        onClick={() => router.push(`/youtube/tutorial/new`)}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
                    >
                        Add Tutorial YouTube Video
                    </Button>
                }
            />
        </div>
    );
};

export default YouTubeTutorialClient;