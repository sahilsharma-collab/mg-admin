"use client";
import React from "react";
import * as z from "zod";
import { AxiosError } from "axios";
import { useState } from "react";
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
import { api } from "@/lib/api";
import type { AddVideoInput } from "@/contracts/api-types";
import { VARIANTS, type YouTubeVariant } from "./variant";

const formSchema = z.object({
  videoId: z.string().min(1, {
    message: "YouTube Video ID is required",
  }),
});

type YouTubeVideoFormValues = z.infer<typeof formSchema>;

// Add-only. Both copies of this form carried an edit path — a `videoId` prop, a
// fetch-and-reset effect, a PUT branch, a `fetching` spinner and "Edit …"
// titles — but nothing reached it: there is no /youtube/[slug]/[videoId] route
// and cell-actions offers only Copy and Delete, so `videoId` was always
// undefined and `isEdit` always false. Restoring edit means adding the route.
const YouTubeVideoForm = ({ variant }: { variant: YouTubeVariant }) => {
  const { slug, label, apiType } = VARIANTS[variant];
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const form = useForm<YouTubeVideoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoId: "",
    },
  });

  const onSubmit = async (data: YouTubeVideoFormValues) => {
    try {
      setLoading(true);

      // P3-8: pinned to the API's request contract, generated from its Zod
      // schemas. A drift in either direction is a compile error here rather
      // than a 400 in production. See contracts/README.md.
      const payload: AddVideoInput = {
        videoId: data.videoId,
        type: apiType,
      };

      await api.post("/api/video", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      router.push(`/youtube/${slug}`);
      router.refresh();
      toast.success(`${label} YouTube Video added.`);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Axios Error:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Something went wrong.");
      } else if (error instanceof Error) {
        console.error("Error:", error.message);
        toast.error(error.message || "Something went wrong.");
      } else {
        console.error("Unknown Error:", error);
        toast.error("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container-padding">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl my-3">
          Add {label} YouTube Video
        </h1>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]"
        >
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            <FormField
              control={form.control}
              name="videoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label} YouTube Video ID</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder={`Enter ${label} YouTube Video ID`}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setVideoPreview(
                          e.target.value
                            ? `https://www.youtube.com/embed/${e.target.value}`
                            : null,
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          <Button
            disabled={loading}
            className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
            type="submit"
          >
            Add
          </Button>
        </form>
      </Form>
    </section>
  );
};

export default YouTubeVideoForm;
