"use client";

import { useState } from "react";
import { MoreHorizontal, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { BlockedUserColumn } from "./columns";
import { UnblockUserModal } from "./UnblockUserModal";

interface CellActionProps {
    data: BlockedUserColumn;
    onSuccess: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onSuccess,
}) => {
    const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);

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
                    <DropdownMenuItem onClick={() => setIsUnblockModalOpen(true)}>
                        <UserX className="mr-2 h-4 w-4" /> Unblock User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <UnblockUserModal
                isOpen={isUnblockModalOpen}
                onClose={() => setIsUnblockModalOpen(false)}
                user={data}
                onSuccess={onSuccess}
            />
        </>
    );
};