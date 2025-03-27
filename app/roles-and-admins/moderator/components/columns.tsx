import { ColumnDef } from "@tanstack/react-table";

export interface ModeratorResponseColumn {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface ModeratorColumn {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export const columns: ColumnDef<ModeratorColumn>[] = [
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
        cell: ({ row }) => {
            const role = row.original.role;
            let bgColor = '';
            let textColor = '';

            switch (role) {
                case 'ADMIN':
                    bgColor = 'bg-purple-100';
                    textColor = 'text-purple-800';
                    break;
                case 'MODERATOR':
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-800';
                    break;
                case 'USER':
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-800';
                    break;
                default:
                    bgColor = 'bg-gray-100';
                    textColor = 'text-gray-800';
            }

            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                    {role}
                </span>
            );
        },
    }
];