"use client";

import { Copy, MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { YouTubeVideoColumn } from "./columns";
import { toast } from "react-toastify";
import { DeleteConfirmationModal } from "@/components/Modal/DeleteConformationModal";
import { api } from "@/lib/api";

interface CellActionProps {
    data: YouTubeVideoColumn;
    onDelete: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDelete = async () => {
        try {
            setLoading(true);
            await api.delete(`/api/video/${data.id}`, {
                headers: {
                    "Content-Type": "application/json",
                }
            });

            toast.success('YouTube video deleted successfully.');
            onDelete();
        } catch (error) {
            toast.error('Failed to delete YouTube video.');
            console.error(error);
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

    const onCopy = (videoId: string) => {
        navigator.clipboard.writeText(videoId);
        toast.success('YouTube ID copied to clipboard.');
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
                        onClick={() => onCopy(data.id)}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Copy ID
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