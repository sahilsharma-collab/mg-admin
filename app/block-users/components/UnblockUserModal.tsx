"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { api } from "@/lib/api";

interface UnblockUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: number;
        name: string;
        email: string;
    };
    onSuccess: () => void;
}

export const UnblockUserModal: React.FC<UnblockUserModalProps> = ({
    isOpen,
    onClose,
    user,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);

    const handleUnblock = async () => {
        try {
            setLoading(true);

            const response = await api.post(
                `/api/profile/unblock/${user.id}`,
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error("Failed to unblock user");
            }

            toast.success(`User ${user.name} unblocked successfully`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error unblocking user:", error);
            toast.error("Failed to unblock user");
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
                            <h3 className="text-lg font-semibold">Unblock User</h3>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                disabled={loading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm font-medium mb-2">User: {user.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>
                            <p className="text-sm text-red-500 dark:text-red-400">
                                Are you sure you want to unblock this user?
                            </p>
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
                                onClick={handleUnblock}
                                disabled={loading}
                                className="bg-[#0ABAB5] hover:bg-[#089e99]"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Confirm Unblock"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};