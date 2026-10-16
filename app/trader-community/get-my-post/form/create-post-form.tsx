"use client";

import React, { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { X, Plus, FileText, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ui/image-upload";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import VoiceRecorder from "./voice-recorder";
import { api } from "@/lib/api";

const LIST_URL = "/trader-community/get-my-post";

interface Tag {
  id: number;
  name: string;
}

// Full admin community composer — mirrors the native mobile composer:
// title, content, image, PDF, voice note, tags, and an admin-only poll.
// Submits to `/api/post` (via the server proxy) as the signed-in admin.
const CreatePostForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // text
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // media
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  // tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // poll (admin-only)
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [pollEndsAt, setPollEndsAt] = useState<Date | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/tags/active");
        const data = res.data;
        const list: Tag[] = data?.tags ?? data?.data ?? (Array.isArray(data) ? data : []);
        setTags(list.map((t) => ({ id: t.id, name: t.name })));
      } catch {
        /* tags are optional; ignore if unavailable */
      }
    })();
  }, []);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const setPollOption = (i: number, v: string) =>
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  const addPollOption = () =>
    setPollOptions((prev) => (prev.length < 4 ? [...prev, ""] : prev));
  const removePollOption = (i: number) =>
    setPollOptions((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));

  // ---- uploads (same endpoints the mobile app uses) ----
  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await api.post("/api/upload", fd);
    return res.data.fileUrl;
  };
  const uploadPdf = async (file: File) => {
    const fd = new FormData();
    fd.append("pdf", file);
    const res = await api.post("/api/post/pdf/upload", fd);
    return res.data as { key: string; name: string; size: number };
  };
  const uploadVoice = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("voiceNote", file);
    const res = await api.post("/api/upload-voice-note", fd);
    return res.data.fileUrl;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");

    let validPollOptions: string[] = [];
    if (isPoll) {
      validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validPollOptions.length < 2) return toast.error("A poll needs at least 2 options.");
      if (!pollEndsAt) return toast.error("Please set a poll end date.");
    }

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim() || null,
      };

      if (imageFile) payload.imageUrl = await uploadImage(imageFile);
      if (voiceFile) payload.voiceNoteUrl = await uploadVoice(voiceFile);
      if (pdfFile) {
        const up = await uploadPdf(pdfFile);
        payload.pdfKey = up.key;
        payload.pdfName = up.name;
        payload.pdfSize = up.size;
      }
      if (selectedTagIds.length) payload.tagIds = selectedTagIds;
      if (isPoll) {
        payload.isPoll = true;
        payload.pollOptions = validPollOptions;
        payload.allowMultipleVotes = allowMultipleVotes;
        payload.pollEndsAt = pollEndsAt!.toISOString();
      }

      await api.post("/api/post", payload);
      toast.success("Post created.");
      router.push(LIST_URL);
      router.refresh();
    } catch (error) {
      const res = (error as AxiosError<{ errors?: { message?: string }; message?: string; error?: string }>)
        ?.response?.data;
      toast.error(res?.errors?.message || res?.message || res?.error || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  // Matches the Input component's dark field background so file pickers, tags
  // and poll controls look consistent with the text inputs.
  const fileInputCls =
    "block w-full text-sm rounded-md border border-[#0000001A] bg-[#EFEFEF] dark:bg-[#2E2941] px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-[#0ABAB5] file:px-3 file:py-1 file:text-white";
  const fieldBg =
    "rounded-md border border-[#0000001A] bg-[#EFEFEF] dark:bg-[#2E2941] px-3 py-2";

  return (
    <section className="container-padding">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl my-3">Create Community Post</h1>
        <Button type="button" variant="outline" onClick={() => router.push(LIST_URL)}>
          Back
        </Button>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-6 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]"
      >
        {/* Title */}
        <div className="grid gap-2">
          <Label>Title*</Label>
          <Input
            value={title}
            disabled={loading}
            maxLength={300}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
          />
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label>Description (Optional)</Label>
          <Textarea
            value={content}
            disabled={loading}
            rows={5}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something for the community…"
          />
        </div>

        {/* Image */}
        <div className="grid gap-2">
          <Label>Image (Optional)</Label>
          <ImageUpload
            value={imagePreview}
            disabled={loading}
            onChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
            }}
            onRemove={() => {
              setImageFile(null);
              setImagePreview("");
            }}
          />
        </div>

        {/* PDF */}
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF attachment (Optional)
          </Label>
          <input
            type="file"
            accept="application/pdf"
            disabled={loading}
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className={fileInputCls}
          />
          {pdfFile && (
            <p className="text-xs text-muted-foreground">
              {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* Voice note */}
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" /> Voice note (Optional)
          </Label>
          <VoiceRecorder disabled={loading} onChange={setVoiceFile} />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">or upload an audio file</summary>
            <input
              type="file"
              accept="audio/*"
              disabled={loading}
              onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
              className={`${fileInputCls} mt-2`}
            />
          </details>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="grid gap-2">
            <Label>Tags (Optional)</Label>
            <div className={`flex flex-wrap gap-4 ${fieldBg}`}>
              {tags.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedTagIds.includes(t.id)}
                    onCheckedChange={() => toggleTag(t.id)}
                    disabled={loading}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Poll (admin-only) */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Make this a poll</Label>
            <Switch checked={isPoll} onCheckedChange={setIsPoll} disabled={loading} />
          </div>
          {isPoll && (
            <div className={`space-y-3 ${fieldBg} py-3`}>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0ABAB5] text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <Input
                    value={opt}
                    disabled={loading}
                    onChange={(e) => setPollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="bg-white dark:bg-[#241f33]"
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      onClick={() => removePollOption(i)}
                      className="shrink-0 text-muted-foreground hover:text-red-500"
                      title="Remove option"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button type="button" variant="outline" size="sm" disabled={loading} onClick={addPollOption}>
                  <Plus className="mr-1 h-4 w-4" /> Add option
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allowMultipleVotes}
                  onCheckedChange={(v) => setAllowMultipleVotes(Boolean(v))}
                  disabled={loading}
                />
                <Label>Allow multiple votes</Label>
              </div>
              <div className="grid gap-2">
                <Label>Poll ends at*</Label>
                <DateTimePicker value={pollEndsAt} onChange={setPollEndsAt} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={() => router.push(LIST_URL)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
          >
            {loading ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CreatePostForm;
