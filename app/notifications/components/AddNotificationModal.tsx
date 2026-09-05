"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";

interface AddNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNotificationAdded: () => void;
}

export const AddNotificationModal: React.FC<AddNotificationModalProps> = ({
    isOpen,
    onClose,
    onNotificationAdded,
}) => {
    const [loading, setLoading] = useState(false);
    const [notificationData, setNotificationData] = useState({
        title: "",
        body: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNotificationData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!notificationData.title.trim() || !notificationData.body.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setLoading(true);
            const response = await apiFetch("/api/notification/send-notification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: notificationData.title,
                    body: notificationData.body,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send notification");
            }

            toast.success("Notification sent successfully");
            onNotificationAdded();
            onClose();
            setNotificationData({ title: "", body: "" });
        } catch (error) {
            console.error("Error sending notification:", error);
            toast.error("Failed to send notification");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                >
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-[90%] max-w-md"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MailPlus className="h-6 w-6 text-blue-500" />
                                <h3 className="text-lg font-semibold">Add New Notification</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                disabled={loading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={notificationData.title}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] dark:bg-gray-800 dark:border-gray-600"
                                    placeholder="Notification title"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Message
                                </label>
                                <textarea
                                    id="body"
                                    name="body"
                                    value={notificationData.body}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] dark:bg-gray-800 dark:border-gray-600"
                                    placeholder="Notification message"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-[#0ABAB5] hover:bg-[#089e99] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Sending</span>
                                    </>
                                ) : (
                                    "Send Notification"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};