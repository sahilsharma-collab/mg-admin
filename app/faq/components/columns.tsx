"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CellAction } from "./cell-actions";

export type FAQColumn = {
    id: number;
    question: string;
    answer: string;
    createdAt: string;
    updatedAt: string;
    // For date filtering
    createdAtRaw: Date;
    updatedAtRaw: Date;
};

export interface FAQResponseColumn {
    id: number;
    question: string;
    answer: string;
    createdAt: string;
    updatedAt: string;
}

export const columns: ColumnDef<FAQColumn>[] = [
    {
        accessorKey: "question",
        header: "Question",
        cell: ({ row }) => {
            const question = row.original.question;
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[20rem] break-words whitespace-normal">
                                {question}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        accessorKey: "answer",
        header: "Answer",
        cell: ({ row }) => {
            const answer = row.original.answer || "-";
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="max-w-[30rem] truncate">
                                {answer}
                            </div>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    },
];