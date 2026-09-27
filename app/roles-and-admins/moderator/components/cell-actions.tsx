"use client";

import { useState } from "react";
import { MoreHorizontal, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { RoleUpdateModal } from "@/app/users/components/RoleUpdateModal";
import type { ModeratorColumn } from "./columns";

interface CellActionProps {
    data: ModeratorColumn;
    onSuccess: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({
    data,
    onSuccess,
}) => {
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

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
                    <DropdownMenuItem onClick={() => setIsRoleModalOpen(true)}>
                        <UserCog className="mr-2 h-4 w-4" /> Change Role
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Use your separate modal component */}
            <RoleUpdateModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                user={data}
                onSuccess={onSuccess}
            />
        </>
    );
};