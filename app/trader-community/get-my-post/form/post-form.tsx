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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import ImageUpload from "@/components/ui/image-upload";

// Form Schema
const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
    content: z.string().min(1, {
        message: "Content is required",
    }),
    imageUrl: z.string().min(1, {
        message: "Image is required",
    }),
});

type PostFormValues = z.infer<typeof formSchema>;

interface PostFormProps {
    postId: string;
}

const PostForm: React.FC<PostFormProps> = ({ postId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const token = Cookies.get("auth_token");

    const form = useForm<PostFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            imageUrl: "",
        },
    });

    // Fetch Post Data for Editing
    useEffect(() => {
        const fetchPost = async () => {
            try {
                setFetching(true);
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const post = response.data.post;
                form.reset({
                    title: post.title,
                    content: post.content,
                    imageUrl: post.imageUrl || "",
                });
            } catch (error) {
                console.error("Failed to fetch post data:", error);
                toast.error("Failed to fetch post data.");
            } finally {
                setFetching(false);
            }
        };
        fetchPost();
    }, [postId, form, token]);

    // Handle Image Upload
    const handleImageUpload = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            return response.data.fileUrl;
        } catch (error) {
            console.error("Failed to upload image:", error);
            toast.error("Failed to upload image.");
            return null;
        }
    };

    // Handle Form Submission
    const onSubmit = async (data: PostFormValues) => {
        try {
            setLoading(true);

            // Upload image if a new file is selected
            let imageUrl = data.imageUrl;
            if (imageFile) {
                imageUrl = await handleImageUpload(imageFile);
                if (!imageUrl) {
                    throw new Error("Image upload failed.");
                }
            }

            const payload = {
                title: data.title,
                content: data.content,
                imageUrl: imageUrl,
            };

            // Update Post
            await axios.put(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            router.push(`/trader-community/get-my-post`);
            router.refresh();
            toast.success("Post updated successfully.");
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
                <h1 className="font-semibold text-2xl my-3">Edit Post</h1>
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
                        <>
                            <div className="grid grid-cols-1 gap-6 md:gap-8">
                                {/* Title Field */}
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="Post Title"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Content Field */}
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Content</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    disabled={loading}
                                                    placeholder="Post Content"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Image Upload Field */}
                                <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Image</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value || ""}
                                                    disabled={loading}
                                                    onChange={(file, preview) => {
                                                        setImageFile(file);
                                                        field.onChange(preview);
                                                    }}
                                                    onRemove={() => {
                                                        field.onChange("");
                                                        setImageFile(null);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </>
                    )}
                    <Button
                        disabled={loading || fetching}
                        className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
                        type="submit"
                    >
                        Update
                    </Button>
                </form>
            </Form>
        </section>
    );
};

export default PostForm;