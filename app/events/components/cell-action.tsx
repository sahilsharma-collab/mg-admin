"use client";

import axios from "axios";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EventColumn } from "./columns";
import { toast } from "react-toastify";
import Cookies from 'js-cookie';
import { DeleteConfirmationModal } from "@/components/Modal/DeleteConformationModal";

interface CellActionProps {
    data: EventColumn;
    onDelete: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();
    const token = Cookies.get('auth_token');

    const handleDelete = async () => {
        try {
            setLoading(true);

            await axios.delete(`${process.env.NEXT_PUBLIC_PROD_URL}/api/event/${data.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                }
            });

            toast.success('Event deleted successfully.');
            onDelete();
        } catch (error) {
            toast.error('Failed to delete event.');
            console.error(error);
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success('Event ID copied to clipboard.');
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-[27px] w-[27px] p-0 border-2 rounded-full border-black ">
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
                    <DropdownMenuItem
                        onClick={() => router.push(`/events/${data.id}`)}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Update
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