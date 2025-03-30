"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface ImagePreviewModalProps {
    imgUrl: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ImagePreviewModal = ({
    imgUrl,
    alt,
    isOpen,
    onClose,
}: ImagePreviewModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-[9999] p-16"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className="relative w-full h-full max-w-[90vw] max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button (top right) */}
                        <button
                            onClick={onClose}
                            className="absolute -top-10 right-0 z-10 p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"
                            aria-label="Close image preview"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        {/* Image container with maximum viewable area */}
                        <div className="relative w-full h-full">
                            <Image
                                src={imgUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                                priority
                            />
                        </div>

                        {/* Optional: Add zoom controls or image navigation here */}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};