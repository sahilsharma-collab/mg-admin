"use client";
import React from "react";
import * as z from "zod";
import { AxiosError } from "axios";
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
import ImageUpload from "@/components/ui/image-upload";
import { api } from "@/lib/api";
import type { CreateEventCategoryInput } from "@/contracts/api-types";

// Form Schema
const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
    description: z.string().min(1, {
        message: "Description is required",
    }),
    imgUrl: z.string().min(1, {
        message: "Image is required",
    }),
    currencyPair: z.string().min(1, {
        message: "Currency pair is required",
    }),
});

type EventCategoryFormValues = z.infer<typeof formSchema>;

interface EventCategoryFormProps {
    categoryId?: string;
}

const EventCategoryForm: React.FC<EventCategoryFormProps> = ({ categoryId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const isEdit = !!categoryId;
    const title = isEdit ? "Edit Event Category" : "Create Event Category";
    const toastMessage = isEdit
        ? "Event Category updated."
        : "Event Category created.";
    const action = isEdit ? "Update" : "Create";

    const form = useForm<EventCategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            imgUrl: "",
            currencyPair: "",
        },
    });

    // Fetch Event Category Data for Editing
    useEffect(() => {
        if (isEdit && categoryId) {
            const fetchEventCategory = async () => {
                try {
                    setFetching(true);
                    const response = await api.get(
                        `/api/event/category/${categoryId}`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    const categoryData = response.data.eventCategory;
                    form.reset({
                        title: categoryData.name,
                        description: categoryData.description,
                        imgUrl: categoryData.imgUrl || "",
                        currencyPair: categoryData.currencyPair || "",
                    });
                } catch (error) {
                    console.error("Failed to fetch event category data:", error);
                    toast.error("Failed to fetch event category data.");
                } finally {
                    setFetching(false);
                }
            };
            fetchEventCategory();
        }
    }, [categoryId, isEdit, form]);

    // Handle Image Upload
    const handleImageUpload = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await api.post(
                "/api/upload",
                formData,
                {
                    headers: {
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
    const onSubmit = async (data: EventCategoryFormValues) => {
        try {
            setLoading(true);

            // Upload image if a new file is selected
            let imgUrl = data.imgUrl;
            if (imageFile) {
                imgUrl = await handleImageUpload(imageFile);
                if (!imgUrl) {
                    throw new Error("Image upload failed.");
                }
            }

            // P3-8: pinned to the API's request contract, generated from its Zod
            // schemas. A drift in either direction is a compile error here rather
            // than a 400 in production. See contracts/README.md.
            const payload: CreateEventCategoryInput = {
                title: data.title,
                description: data.description,
                imgUrl: imgUrl,
                currencyPair: data.currencyPair,
            };

            if (isEdit && categoryId) {
                // Update Event Category
                await api.put(
                    `/api/event/category/${categoryId}`,
                    payload,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            } else {
                // Create Event Category
                await api.post(
                    "/api/event/category",
                    payload,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            router.push("/events/event-category");
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
                                                placeholder="Event Category Title"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description Field */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Event Category Description"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Currency Pair Field */}
                            <FormField
                                control={form.control}
                                name="currencyPair"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency Pair</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="BTC/USD"
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
                                name="imgUrl"
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

export default EventCategoryForm;