"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
    value: string;
    disabled?: boolean;
    onChange: (file: File, preview: string) => void;
    onRemove: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    disabled,
    onChange,
    onRemove,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [pasteHint, setPasteHint] = useState(false);

    const handleFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith("image/")) return;
            const preview = URL.createObjectURL(file);
            onChange(file, preview);
        },
        [onChange]
    );

    // Clipboard paste (Ctrl+V / Cmd+V)
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            if (disabled) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        handleFile(file);
                        setPasteHint(true);
                        setTimeout(() => setPasteHint(false), 1500);
                    }
                    break;
                }
            }
        };
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [disabled, handleFile]);

    // Drag and drop
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    if (value) {
        return (
            <div className="relative w-fit">
                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <Image
                        src={value}
                        alt="Preview"
                        width={180}
                        height={180}
                        className="object-cover"
                    />
                </div>
                <Button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full shadow-md hover:bg-red-600 transition-colors p-0 flex items-center justify-center"
                    aria-label="Remove image"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </Button>
                <button
                    type="button"
                    onClick={() => !disabled && inputRef.current?.click()}
                    disabled={disabled}
                    className="mt-2 text-xs text-[#0ABAB5] hover:underline block"
                >
                    Change image
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                />
            </div>
        );
    }

    return (
        <div
            ref={dropRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`
                relative flex flex-col items-center justify-center gap-3
                rounded-md border border-dashed cursor-pointer select-none
                transition-all duration-200 p-8 min-h-[160px]
                bg-[#EFEFEF] dark:bg-[#2E2941]
                ${isDragging
                    ? "border-[#0ABAB5]"
                    : "border-[#0000001A] hover:border-[#0ABAB5]"
                }
                ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
            `}
        >
            {/* Upload icon */}
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? "bg-[#0ABAB5]/20" : "bg-white/60 dark:bg-white/10"}
            `}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDragging ? "#0ABAB5" : "#6B7280"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            </div>

            <div className="text-center space-y-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragging ? "Drop image here" : "Upload an image"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Drag &amp; drop, paste (Ctrl+V), or{" "}
                    <span className="text-[#0ABAB5] font-medium">browse files</span>
                </p>
                <p className="text-xs text-gray-400">
                    PNG, JPG, GIF, WEBP up to any size
                </p>
            </div>

            {/* Method badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/60 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Drag &amp; Drop
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/60 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Ctrl+V Paste
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/60 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    Browse Folders
                </span>
            </div>

            {/* Paste flash indicator */}
            {pasteHint && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#0ABAB5]/20 border-2 border-[#0ABAB5] pointer-events-none">
                    <span className="text-[#0ABAB5] font-semibold text-sm">Image pasted!</span>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
                disabled={disabled}
            />
        </div>
    );
};

export default ImageUpload;
