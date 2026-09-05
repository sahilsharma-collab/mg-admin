"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiFetch } from "@/lib/api";

interface Reaction {
    id: number;
    emoji: string;
    userId: number;
    postId: number;
    replyId: number | null;
    createdAt: string;
}

interface Reply {
    id: number;
    content: string;
    imageUrl: string | null;
    authorId: number;
    postId: number;
    parentId: number | null;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
    author: {
        userName: string;
        imgUrl: string | null;
    };
    reactions: Reaction[];
    replies: Reply[];
}

interface Post {
    id: number;
    title: string;
    content: string;
    imageUrl: string | null;
    authorId: number;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
    reactions: Reaction[];
    author: {
        id: number;
        userName: string;
        imgUrl: string | null;
    };
    replies: Reply[];
}

const postUpdateSchema = z.object({
    isBlocked: z.boolean(),
    blockReason: z.string().optional(),
});

type PostUpdateFormData = z.infer<typeof postUpdateSchema>;

const countTotalReplies = (replies: Reply[]): number => {
    return replies.reduce((total, reply) => {
        return total + 1 + countTotalReplies(reply.replies);
    }, 0);
};

const PostPage = ({ postId }: { postId: string }) => {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    const {
        setValue,
    } = useForm<PostUpdateFormData>({
        resolver: zodResolver(postUpdateSchema),
        defaultValues: {
            isBlocked: false,
            blockReason: "",
        },
    });

    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                const response = await apiFetch(
                    `/api/post/${postId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                const data = await response.json();
                setPost(data.post);
                setValue("isBlocked", data.post.isBlocked);
                setValue("blockReason", "");
            } catch (error) {
                console.error("Error fetching post:", error);
                toast.error("Failed to load post details");
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId, setValue]);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return format(date, 'MMM dd, yyyy h:mm a');
    };

    if (loading) {
        return (
            <section className="container-padding">
                <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                    <div className="flex space-x-2">
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "200ms" }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                            style={{ animationDelay: "400ms" }}
                        ></div>
                    </div>
                </div>
            </section>
        );
    }

    if (!post) {
        return (
            <section className="container-padding">
                <div className="text-center py-10">
                    <h2 className="text-xl font-medium">Post not found</h2>
                </div>
            </section>
        );
    }

    const totalReplies = countTotalReplies(post.replies);
    const totalReactions = post.reactions.length;

    return (
        <section className="container-padding">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl my-3">{post.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${post.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {post.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                </span>
            </div>

            <article className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                <div className="grid grid-cols-1 gap-6">
                    {/* Post Details */}
                    <div className="space-y-6">
                        <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                            <div className="flex items-center space-x-3 mb-3">
                                {post.author.imgUrl && (
                                    <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                        <Image
                                            src={post.author.imgUrl}
                                            alt={post.author.userName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-medium">{post.author.userName}</h3>
                                    <p className="text-sm text-gray-500">{formatDateTime(post.createdAt)}</p>
                                </div>
                            </div>

                            {post.content && (
                                <p className="whitespace-pre-line mt-2">{post.content}</p>
                            )}

                            <div className="flex items-center space-x-4 mt-4 text-sm">
                                <span className="flex items-center">
                                    <span className="mr-1">💖</span>
                                    {totalReactions} reactions
                                </span>
                                <span className="flex items-center">
                                    <span className="mr-1">💬</span>
                                    {totalReplies} comments
                                </span>
                            </div>
                        </div>

                        {post.imageUrl && (
                            <div className="bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] rounded-md p-4">
                                <div className="relative w-full h-[30rem] rounded-md overflow-hidden">
                                    <Image
                                        src={post.imageUrl}
                                        alt="Post image"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>                
            </article>
        </section>
    );
};

export default PostPage;