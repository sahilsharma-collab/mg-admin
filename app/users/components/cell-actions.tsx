"use client";

import { useState } from "react";
import { MoreHorizontal, UserCog, Trash2 } from "lucide-react"; // Added Trash2 icon
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserColumn } from "./columns";
import { RoleUpdateModal } from "./RoleUpdateModal";
import { DeleteUserModal } from "./DeleteUserModal"; // Added new modal
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";

interface CellActionProps {
  data: UserColumn;
  onSuccess: () => void;
}

export const CellAction: React.FC<CellActionProps> = ({ data, onSuccess }) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Added delete modal state

  const removeExness = async () => {
    try {
      const response = await apiFetch(
        `/api/exness/remove/${data.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      toast.success("Exness ID removed successfully");
      onSuccess();
    } catch (error) {
      toast.error("Error removing Exness ID");
      console.error("Error removing Exness:", error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-[27px] w-[27px] p-0 border-2 rounded-full border-black dark:border-[#B3A5C6] dark:text-[#B3A5C6]"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsRoleModalOpen(true)}>
            <UserCog className="mr-2 h-4 w-4" /> Change Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => removeExness()}>
            <X className="mr-2 h-4 w-4" /> Remove Exness
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RoleUpdateModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        user={data}
        onSuccess={onSuccess}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        user={data}
        onSuccess={onSuccess}
      />
    </>
  );
};