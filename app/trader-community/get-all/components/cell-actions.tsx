"use client";

import axios from "axios";
import { Ban, Copy, Eye, MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { CommunityPostColumn } from "./columns";
import { toast } from "react-toastify";
import { DeleteConfirmationModal } from "@/components/Modal/DeleteConformationModal";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface CellActionProps {
    data: CommunityPostColumn;
    onDelete: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        try {
            setLoading(true);

            await api.delete(`/api/post/${data.id}`, {
                headers: {
                    "Content-Type": "application/json",
                }
            });

            toast.success('Post deleted successfully.');
            onDelete();
        } catch (error: unknown) {
            let errorMessage = 'Failed to delete post.';

            if (axios.isAxiosError(error) && error.response?.data?.errors?.message) {
                errorMessage = error.response.data.errors.message;
            }

            toast.error(errorMessage);
            console.error(error);
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success('Post ID copied to clipboard.');
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
                    <DropdownMenuItem
                        onClick={() => onCopy(data.id.toString())}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Copy Id
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/trader-community/get-all/${data.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    // onClick={() => onSuspend(data.id)}
                    >
                        <Ban className="mr-2 h-4 w-4" /> Suspend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDelete}
                loading={loading}
            />
        </>
    );
};