"use client";

import { ColumnDef } from "@tanstack/react-table";

export type PaymentWithUser = {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  cregisId: string | null;
  amountPaid: number | null;
  epayId: string | null;
  telegramLink: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    country: string;
  };
  package: {
    id: string;
    // Add other package fields as needed
  };
};

export const columns: ColumnDef<PaymentWithUser>[] = [
  {
    accessorKey: "user.name",
    header: "Name",
  },
  {
    accessorKey: "user.email",
    header: "Email",
  },
  {
    accessorKey: "user.phoneNumber",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let bgColor = "bg-gray-200";
      let textColor = "text-gray-800";
      if (status === "paid" || status === "SUCCESS") {
        bgColor = "bg-green-100";
        textColor = "text-green-800";
      } else if (status === "PENDING") {
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
      } else if (status === "expired" || status === "FAILED") {
        bgColor = "bg-red-100";
        textColor = "text-red-800";
      }

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `${row.original.amount} ${row.original.currency}`,
  },

  {
    accessorKey: "paymentMethod",
    header: "Method",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    accessorKey: "id",
    header: "Order ID",
  },

  {
    accessorKey: "cregisId",
    header: "Transaction ID",
  },
];
