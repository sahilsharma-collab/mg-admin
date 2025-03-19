"use client";

import { ColumnDef } from "@tanstack/react-table";

export type UserColumn = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
};

export const columns: ColumnDef<UserColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "role",
        header: "Role",
    },
    // {
    //     accessorKey: "createdAt",
    //     header: "Created At",
    // },
    // {
    //     accessorKey: "updatedAt",
    //     header: "Updated At",
    // },
    // {
    //     header: "Actions",
    //     id: "actions",
    //     cell: ({ row }) => <CellAction data={row.original} onDelete={() => { }} />,
    // },
];