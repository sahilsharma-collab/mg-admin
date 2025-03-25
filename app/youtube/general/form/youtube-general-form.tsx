"use client";
import React from "react";
import * as z from "zod";
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "react-toastify";
import Cookies from "js-cookie";

// Form Schema
const formSchema = z.object({
    videoId: z.string().min(1, {
        message: "YouTube Video ID is required",
    }),
});

type YouTubeGeneralFormValues = z.infer<typeof formSchema>;

interface YouTubeGeneralFormProps {
    videoId?: string;
}

const YouTubeGeneralForm: React.FC<YouTubeGeneralFormProps> = ({ videoId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);

    const isEdit = !!videoId;
    const title = isEdit ? "Edit General YouTube Video" : "Add General YouTube Video";
    const toastMessage = isEdit
        ? "General YouTube Video updated."
        : "General YouTube Video added.";
    const action = isEdit ? "Update" : "Add";
    const token = Cookies.get("auth_token");

    const form = useForm<YouTubeGeneralFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            videoId: "",
        },
    });

    // Fetch YouTube Video Data for Editing
    useEffect(() => {
        if (isEdit && videoId) {
            const fetchYouTubeVideo = async () => {
                try {
                    setFetching(true);
                    const response = await axios.get(
                        `${process.env.NEXT_PUBLIC_PROD_URL}/api/video/${videoId}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    const videoData = response.data.video;
                    form.reset({
                        videoId: videoData.videoId,
                    });
                    setVideoPreview(`https://www.youtube.com/embed/${videoData.videoId}`);
                } catch (error) {
                    console.error("Failed to fetch YouTube video data:", error);
                    toast.error("Failed to fetch YouTube video data.");
                } finally {
                    setFetching(false);
                }
            };
            fetchYouTubeVideo();
        }
    }, [videoId, isEdit, form, token]);

    // Handle Video Preview
    const handleVideoPreview = (videoId: string) => {
        const youtubeUrl = `https://www.youtube.com/embed/${videoId}`;
        setVideoPreview(youtubeUrl);
    };

    const onSubmit = async (data: YouTubeGeneralFormValues) => {
        try {
            setLoading(true);

            const payload = {
                videoId: data.videoId,
                type: "GENERAL",
            };

            if (isEdit && videoId) {
                // Update YouTube Video
                await axios.put(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/video/${videoId}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            } else {
                // Create YouTube Video
                await axios.post(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/video`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            router.push("/youtube/general");
            router.refresh();
            toast.success(toastMessage);
        } catch (error: unknown) {
            if (error instanceof AxiosError) {
                console.log("Axios Error:", error.response?.data || error.message);
                toast.error(error.response?.data?.message || "Something went wrong.");
            } else if (error instanceof Error) {
                console.log("Error:", error.message);
                toast.error(error.message || "Something went wrong.");
            } else {
                console.log("Unknown Error:", error);
                toast.error("Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="container-padding">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl my-3">{title}</h1>
            </div>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]"
                >
                    {fetching ? (
                        <div className="flex justify-center items-center h-24">
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
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:gap-8">
                            {/* Video ID Field */}
                            <FormField
                                control={form.control}
                                name="videoId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>General YouTube Video ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter General YouTube Video ID"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    if (e.target.value) {
                                                        handleVideoPreview(e.target.value);
                                                    } else {
                                                        setVideoPreview(null);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Video Preview */}
                            {videoPreview && (
                                <div className="mt-4">
                                    <FormLabel>Video Preview</FormLabel>
                                    <div className="relative aspect-video rounded-lg overflow-hidden">
                                        <iframe
                                            src={videoPreview}
                                            title="YouTube Video Preview"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <Button
                        disabled={loading || fetching}
                        className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
                        type="submit"
                    >
                        {action}
                    </Button>
                </form>
            </Form>
        </section>
    );
};

export default YouTubeGeneralForm;