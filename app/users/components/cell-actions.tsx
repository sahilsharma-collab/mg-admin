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
import type { UserColumn } from "./columns";
import { RoleUpdateModal } from "./RoleUpdateModal";
import { DeleteUserModal } from "./DeleteUserModal"; // Added new modal
import { DeleteConfirmationModal } from "@/components/Modal/DeleteConformationModal";
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
  // Severing a broker binding is destructive and irreversible from here: the
  // user has to link their Exness ID again. Its two neighbours in this menu
  // both open a dialog first, so firing straight from the menu item made this
  // the one entry that punishes the muscle memory the others build.
  const [isRemoveExnessModalOpen, setIsRemoveExnessModalOpen] = useState(false);
  const [removeExnessLoading, setRemoveExnessLoading] = useState(false);

  const removeExness = async () => {
    try {
      setRemoveExnessLoading(true);
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
    } finally {
      setRemoveExnessLoading(false);
      setIsRemoveExnessModalOpen(false);
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
          <DropdownMenuItem onClick={() => setIsRemoveExnessModalOpen(true)}>
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

      <DeleteConfirmationModal
        isOpen={isRemoveExnessModalOpen}
        onClose={() => setIsRemoveExnessModalOpen(false)}
        onConfirm={removeExness}
        loading={removeExnessLoading}
        warningNote={`Removes the Exness binding${
          data.exnessId ? ` (${data.exnessId})` : ""
        } from ${data.email}. They will have to link their Exness account again.`}
      />
    </>
  );
};