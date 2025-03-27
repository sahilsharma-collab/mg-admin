"use client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Copy, Eye, MoreHorizontal, Trash, CheckCircle } from "lucide-react";
import { IssueColumn } from "./columns";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import { DeleteConfirmationModal } from "@/components/Modal/DeleteConformationModal";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

interface CellActionProps {
    data: IssueColumn;
    onRefresh: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({ data, onRefresh }) => {
    const token = Cookies.get('auth_token');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(data.status || "PENDING");
    const [remarks, setRemarks] = useState(data.remarks || "");
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/issue/${data.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            toast.success("Issue deleted successfully");
            onRefresh();
        } catch (error) {
            console.error("Error deleting issue:", error);
            toast.error("Failed to delete issue");
        } finally {
            setLoading(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleStatusUpdate = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/issue/${data.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status,
                    remarks
                })
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            toast.success("Issue status updated successfully");
            onRefresh();
            setIsStatusModalOpen(false);
        } catch (error) {
            console.error("Error updating issue status:", error);
            toast.error("Failed to update issue status");
        } finally {
            setLoading(false);
        }
    };

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success('Issue ID copied to clipboard.');
    }

    const handlePreview = () => {
        router.push(`/reported-issues/${data.id}`);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-[27px] w-[27px] p-0 border-2 rounded-full border-black dark:border-[#B3A5C6] dark:text-[#B3A5C6]">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onCopy(data.id.toString())}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Id
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePreview}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsStatusModalOpen(true)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Update Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)}>
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                loading={loading}
            />

            {/* Status Update Modal */}
            <AnimatePresence>
                {isStatusModalOpen && (
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
                                <h3 className="text-lg font-semibold">Update Issue Status</h3>
                                <button
                                    onClick={() => setIsStatusModalOpen(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    disabled={loading}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PENDING">PENDING</SelectItem>
                                            <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Remarks</label>
                                    <Textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add remarks (optional)"
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsStatusModalOpen(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleStatusUpdate}
                                    disabled={loading}
                                    className="bg-[#0ABAB5] hover:bg-[#089e99] flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Update Status"
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};