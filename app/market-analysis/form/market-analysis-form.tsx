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
import Image from "next/image";

// Updated Form Schema - only title is required
const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
    description: z.string().optional(),
    imgUrl: z.string().optional(),
});

type MarketAnalysisFormValues = z.infer<typeof formSchema>;

interface MarketAnalysisFormProps {
    maId?: string;
}

const MarketAnalysisForm: React.FC<MarketAnalysisFormProps> = ({ maId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const isEdit = !!maId;
    const title = isEdit ? "Edit Market Analysis" : "Create Market Analysis";
    const toastMessage = isEdit
        ? "Market Analysis updated."
        : "Market Analysis created.";
    const action = isEdit ? "Update" : "Create";
    const token = Cookies.get("auth_token");

    const form = useForm<MarketAnalysisFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            imgUrl: "",
        },
    });

    // Fetch Market Analysis Data for Editing
    useEffect(() => {
        if (isEdit && maId) {
            const fetchMarketAnalysis = async () => {
                try {
                    setFetching(true);
                    const response = await axios.get(
                        `${process.env.NEXT_PUBLIC_PROD_URL}/api/market/${maId}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    const marketData = response.data.marketAnalysis;
                    form.reset({
                        title: marketData.title,
                        description: marketData.description || "",
                        imgUrl: marketData.imgUrl || "",
                    });
                } catch (error) {
                    console.error("Failed to fetch market analysis data:", error);
                    toast.error("Failed to fetch market analysis data.");
                } finally {
                    setFetching(false);
                }
            };
            fetchMarketAnalysis();
        }
    }, [maId, isEdit, form, token]);

    // Handle Image Upload
    const handleImageUpload = async (file: File | null) => {
        if (!file) return null;

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
    const onSubmit = async (data: MarketAnalysisFormValues) => {
        try {
            setLoading(true);

            // Upload image if a new file is selected
            let imgUrl = data.imgUrl;
            if (imageFile) {
                imgUrl = await handleImageUpload(imageFile);
            }

            const payload = {
                title: data.title,
                description: data.description || null, // Send null if empty
                imgUrl: imgUrl || null, // Send null if empty
            };

            if (isEdit && maId) {
                // Update Market Analysis
                await axios.put(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/market/${maId}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            } else {
                // Create Market Analysis
                await axios.post(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/market`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            router.push("/market-analysis");
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
                            {/* Title Field (Required) */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title*</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Market Analysis Title"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description Field (Optional) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Market Analysis Description (Optional)"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Image Upload Field (Optional) */}
                            <FormField
                                control={form.control}
                                name="imgUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                disabled={loading}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        field.onChange(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        {field.value && (
                                            <div className="relative mt-2 w-fit">
                                                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                    <Image
                                                        src={field.value}
                                                        alt="Preview"
                                                        width={150}
                                                        height={150}
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        field.onChange("");
                                                        setImageFile(null);
                                                        const fileInput = document.getElementById("image-upload") as HTMLInputElement;
                                                        if (fileInput) {
                                                            fileInput.value = "";
                                                        }
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-6 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                                    aria-label="Remove image"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </Button>
                                            </div>
                                        )}
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

export default MarketAnalysisForm;