"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { buildColumns, YouTubeVideoColumn } from "./columns";
import { apiFetch } from "@/lib/api";
import { VARIANTS, type YouTubeVariant } from "./variant";

const YouTubeVideoClient = ({ variant }: { variant: YouTubeVariant }) => {
  const { slug, label } = VARIANTS[variant];
  const [formattedVideos, setFormattedVideos] = useState<YouTubeVideoColumn[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchYouTubeVideos = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/video/${slug}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        const formattedData: YouTubeVideoColumn[] = data.videos.map(
          (video: YouTubeVideoColumn) => ({
            id: video.id,
            videoId: video.videoId,
          }),
        );

        setFormattedVideos(formattedData);
      } catch (error) {
        console.error("Error fetching YouTube videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchYouTubeVideos();
  }, [refreshCounter, slug]);

  const columns = useMemo(
    () => buildColumns(() => setRefreshCounter((prev) => prev + 1)),
    [],
  );

  return (
    <div className="container-padding">
      <DataTable
        redirectUrl=""
        searchKey="videoId"
        columns={columns}
        data={formattedVideos}
        loading={loading}
        title={<h1 className="text-xl font-semibold">YouTube Videos List</h1>}
        actionButton={
          <Button
            onClick={() => router.push(`/youtube/${slug}/new`)}
            className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
          >
            Add {label} YouTube Video
          </Button>
        }
      />
    </div>
  );
};

export default YouTubeVideoClient;
