import { ColumnDef } from "@tanstack/react-table";

export type NotificationColumn = {
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
};

export const columns: ColumnDef<NotificationColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "message",
        header: "Message",
    },
    {
        accessorKey: "createdAt",
        header: "Received",
    },
    {
        accessorKey: "isRead",
        header: "Status",
        cell: ({ row }) => {
            const isRead = row.original.isRead;
            let statusClass = "";

            if (isRead) {
                statusClass = "bg-green-100 text-green-800";
            } else {
                statusClass = "bg-yellow-100 text-yellow-800";
            }

            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                    {isRead ? "Read" : "Unread"}
                </span>
            );
        }
    },
    {
        id: "actions",
        cell: () => <div className="flex gap-2"></div>,
    },
];