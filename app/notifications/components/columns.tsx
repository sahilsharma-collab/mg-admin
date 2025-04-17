import { ColumnDef } from "@tanstack/react-table";

export type NotificationColumn = {
  id: number;
  title: string;
  message: string;

  createdAt: string;
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
    id: "actions",
    cell: () => <div className="flex gap-2"></div>,
  },
];
