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

// Form Schema - question and answer are required
const formSchema = z.object({
    question: z.string().min(1, {
        message: "Question is required",
    }),
    answer: z.string().min(1, {
        message: "Answer is required",
    }),
});

type FAQFormValues = z.infer<typeof formSchema>;

interface FAQFormProps {
    faqId?: string;
}

const FAQForm: React.FC<FAQFormProps> = ({ faqId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const isEdit = !!faqId;
    const title = isEdit ? "Edit FAQ" : "Create FAQ";
    const toastMessage = isEdit
        ? "FAQ updated successfully."
        : "FAQ created successfully.";
    const action = isEdit ? "Update" : "Create";
    const token = Cookies.get("auth_token");

    const form = useForm<FAQFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            question: "",
            answer: "",
        },
    });

    // Fetch FAQ Data for Editing
    useEffect(() => {
        if (isEdit && faqId) {
            const fetchFAQ = async () => {
                try {
                    setFetching(true);
                    const response = await axios.get(
                        `${process.env.NEXT_PUBLIC_PROD_URL}/api/faq/${faqId}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    const faqData = response.data.faq;
                    form.reset({
                        question: faqData.question,
                        answer: faqData.answer,
                    });
                } catch (error) {
                    console.error("Failed to fetch FAQ data:", error);
                    toast.error("Failed to fetch FAQ data.");
                } finally {
                    setFetching(false);
                }
            };
            fetchFAQ();
        }
    }, [faqId, isEdit, form, token]);

    // Handle Form Submission
    const onSubmit = async (data: FAQFormValues) => {
        try {
            setLoading(true);

            const payload = {
                question: data.question,
                answer: data.answer,
            };

            if (isEdit && faqId) {
                // Update FAQ
                await axios.put(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/faq/${faqId}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            } else {
                // Create FAQ
                await axios.post(
                    `${process.env.NEXT_PUBLIC_PROD_URL}/api/faq`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            router.push("/faq");
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
                            {/* Question Field (Required) */}
                            <FormField
                                control={form.control}
                                name="question"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question*</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter your question"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Answer Field (Required) */}
                            <FormField
                                control={form.control}
                                name="answer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Answer*</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Provide the answer"
                                                {...field}
                                                className="min-h-[120px]"
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

export default FAQForm;