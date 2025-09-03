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
  utmSource: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    country: string;
  };
  package: {
    id: string;
    name: string;
    description: string;
    currentPrice: number;
    duration: number;
    currency: string;
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
    accessorKey: "user.country",
    header: "Country",
  },
  {
    accessorKey: "package.name",
    header: "Package",
    cell: ({ row }) => {
      const packageData = row.original.package;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{packageData.duration} month</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let bgColor = "bg-gray-200";
      let textColor = "text-gray-800";
      if (
        status === "paid" ||
        status === "SUCCESS" ||
        status === "paid_partial" ||
        status === "overpaid"
      ) {
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
    cell: ({ row }) => `$${row.original.amount}`,
  },
  {
    accessorKey: "amountPaid",
    header: "Amount Paid",
    cell: ({ row }) => {
      const amountPaid = row.original.amount;
      return amountPaid ? `$${amountPaid}` : "N/A";
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => {
      const method = row.original.paymentMethod;
      return (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            method === "UPI"
              ? "bg-blue-100 text-blue-800"
              : method === "CRYPTO"
              ? "bg-purple-100 text-purple-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {method}
        </span>
      );
    },
  },
  {
    accessorKey: "utmSource",
    header: "UTM Source",
    cell: ({ row }) => {
      const source = row.original.utmSource;
      return source || "Direct";
    },
  },
  {
    accessorKey: "createdAt",
    header: "Renewal Date",
  },

  {
    accessorKey: "orderId",
    header: "Order ID",
    cell: ({ row }) => {
      const orderId = row.original.id;
      if (!orderId) return "N/A";

      return <span className="text-xs font-mono">{orderId}</span>;
    },
  },
];
