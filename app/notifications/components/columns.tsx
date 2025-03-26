import { ColumnDef } from "@tanstack/react-table";

export type NotificationResponseColumn = {
    id: number;
    userId: number;
    notificationId: number;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
    notification: {
        id: number;
        title: string;
        message: string;
        route: string;
        createdAt: string;
        updatedAt: string;
    };
};

export type NotificationColumn = {
    id: number;
    title: string;
    message: string;
    route: string;
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
        accessorKey: "isRead",
        header: "Status",
        cell: ({ row }) => (
            <span className={row.original.isRead ? "text-gray-500" : "font-bold text-blue-600"}>
                {row.original.isRead ? "Read" : "Unread"}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "Received",
    },
    {
        id: "actions",
        cell: () => <div className="flex gap-2"></div>,
    },
];