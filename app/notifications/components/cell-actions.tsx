"use client";

import { Eye, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationColumn } from "./columns";

interface CellActionProps {
    data: NotificationColumn;
    onMarkAsRead: (id: number) => Promise<void>;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onMarkAsRead,
}) => {
    const [loading, setLoading] = useState(false);

    const handleMarkAsRead = async () => {
        if (!data.isRead) {
            try {
                setLoading(true);
                await onMarkAsRead(data.id);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-[27px] w-[27px] p-0 border-2 rounded-full border-black dark:border-[#B3A5C6] dark:text-[#B3A5C6]"
                    // disabled={loading || data.isRead}
                >
                    <span className="sr-only">Open menu</span>
                    {loading ? (
                        <span className="animate-spin">↻</span>
                    ) : (
                        <MoreHorizontal className="h-5 w-5" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={handleMarkAsRead}
                    disabled={loading || data.isRead}
                >
                    <Eye className="mr-2 h-4 w-4" />
                    Mark as read
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};