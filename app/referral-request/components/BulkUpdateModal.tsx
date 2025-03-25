"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: number[];
    refreshData: () => void;
    onSuccess?: () => void;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
    isOpen,
    onClose,
    selectedIds,
    refreshData,
    onSuccess,
}) => {
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const token = Cookies.get("auth_token");

    const handleBulkUpdate = async () => {
        if (!status) {
            toast.error("Please select a status");
            return;
        }

        if (selectedIds.length === 0) {
            toast.error("No requests selected");
            return;
        }

        try {
            setLoading(true);
            setProgress(0);

            // Process each ID one by one
            for (let i = 0; i < selectedIds.length; i++) {
                const requestId = selectedIds[i];
                try {
                    await axios.post(
                        `${process.env.NEXT_PUBLIC_PROD_URL}/api/exness/verify`,
                        {
                            requestId: requestId,
                            status: status
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    // Update progress
                    setProgress(((i + 1) / selectedIds.length) * 100);

                    // Small delay between requests to avoid rate limiting
                    if (i < selectedIds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } catch (error) {
                    console.error(`Failed to update request ID ${requestId}:`, error);
                    // Continue with next request even if one fails
                }
            }

            toast.success(`Updated ${selectedIds.length} requests to ${status}`);
            refreshData();
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Error during bulk update process");
            console.error(error);
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
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                                <h3 className="text-lg font-semibold">Bulk Update Status</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                disabled={loading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            You are about to update <span className="font-semibold">{selectedIds.length}</span> request(s).
                            Please select the new status:
                        </p>

                        <div className="mb-4">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">PENDING</SelectItem>
                                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {loading && (
                            <div className="mb-4">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-[#0ABAB5] h-2.5 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 text-right">
                                    {Math.round(progress)}% complete ({Math.round(progress / 100 * selectedIds.length)}/{selectedIds.length})
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkUpdate}
                                disabled={loading || !status}
                                className="bg-[#0ABAB5] hover:bg-[#089e99] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Updating</span>
                                    </>
                                ) : (
                                    "Update"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};