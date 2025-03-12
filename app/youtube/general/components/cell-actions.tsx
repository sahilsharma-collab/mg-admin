"use client";

import axios from "axios";
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
import Cookies from 'js-cookie';

interface CellActionProps {
    data: YouTubeVideoColumn;
    onDelete: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const token = Cookies.get('auth_token');

    const onConfirm = async () => {
        try {
            setLoading(true);

            // Call the API to delete the video
            await axios.delete(`${process.env.NEXT_PUBLIC_PROD_URL}/api/video/${data.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
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
                    <Button variant="ghost" className="h-[27px] w-[27px] p-0 border-2 rounded-full border-black ">
                        <span className="sr-only">Open menu</span>
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <MoreHorizontal className="h-5 w-5" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => onCopy(data.id)}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onConfirm()}
                    >
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};