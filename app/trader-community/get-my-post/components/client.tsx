"use client";
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import { columns, CommunityPostColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { PostResponse } from '../../get-all/components/columns';
import { apiFetch } from "@/lib/api";

const CommunityGetMyClient = () => {
    const [formattedPosts, setFormattedPosts] = useState<CommunityPostColumn[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                const response = await apiFetch("/api/post/my-posts", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();

                const formatDateTime = (dateString: string) => {
                    const date = new Date(dateString);
                    const formattedDate = date.toLocaleDateString('en-US');
                    const formattedTime = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    return `${formattedDate} ${formattedTime}`;
                };

                const formattedData: CommunityPostColumn[] = data.posts.map((post: PostResponse) => ({
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    imageUrl: post.imageUrl,
                    author: post.author.userName,
                    authorImageUrl: post.author.imgUrl,
                    createdAt: formatDateTime(post.createdAt),
                    updatedAt: formatDateTime(post.updatedAt),
                    reactionsCount: post._count.reactions,
                    repliesCount: post._count.replies,
                    viewCount: post._count.PostView,
                    reactions: post.reactions,
                    myReaction: post.myReaction,
                }));

                setFormattedPosts(formattedData);
            } catch (error) {
                console.error("Error fetching posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [refreshCounter]);

    const refreshData = () => {
        setRefreshCounter(prev => prev + 1);
    };

    const columnsWithRefresh = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<CommunityPostColumn> }) => (
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
                searchKey="title"
                columns={columnsWithRefresh}
                data={formattedPosts}
                loading={loading}
                title={<h1 className="text-xl font-semibold">Community Posts List</h1>}
            />
        </div>
    );
};

export default CommunityGetMyClient;