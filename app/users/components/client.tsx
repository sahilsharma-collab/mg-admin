"use client";
import { DataTable } from "@/components/ui/data-table";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { columns, UserColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button"; // Import Button component
import { Download } from "lucide-react"; // Import download icon

const UserDataClient = () => {
  const [formattedUsers, setFormattedUsers] = useState<UserColumn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const token = Cookies.get("auth_token");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile/all`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Users Data:", data);

        const formatDateTime = (dateString: string) => {
          const date = new Date(dateString);
          const formattedDate = date.toLocaleDateString("en-US");
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          return `${formattedDate} ${formattedTime}`;
        };

        const formattedData: UserColumn[] = data.users.map(
          (user: UserColumn) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            exnessId: user.exnessId,
            createdAt: formatDateTime(user.createdAt),
            updatedAt: formatDateTime(user.updatedAt),
            exnessVerified: user.exnessVerified,
            // Add raw date objects for filtering
            createdAtRaw: new Date(user.createdAt),
            updatedAtRaw: new Date(user.updatedAt),
          })
        );

        setFormattedUsers(formattedData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [refreshCounter, token]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const downloadCSV = () => {
    // CSV header
    let csv = "ID,Name,Email,Role,Created At,Updated At\n";

    // Add data rows
    formattedUsers.forEach((user) => {
      csv += `"${user.id}","${user.name}","${user.email}","${user.role}","${user.createdAt}","${user.updatedAt}"\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `users_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnsWithActions = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: { row: Row<UserColumn> }) => (
          <CellAction data={row.original} onSuccess={refreshData} />
        ),
      };
    }
    return col;
  });

  return (
    <div className="container-padding">
      <DataTable
        redirectUrl=""
        searchKey={["email", "exnessId"]}
        columns={columnsWithActions}
        data={formattedUsers}
        loading={loading}
        title={<h1 className="text-xl font-semibold">Users List</h1>}
        actionButton={
          <Button
            onClick={downloadCSV}
            className="bg-[#0ABAB5] rounded-full hover:bg-[#089e99] transition-colors dark:text-white"
          >
            <Download className="h-4 w-4 -mr-1" />
            Export
          </Button>
        }
        enableDateFilter={true}
      />
    </div>
  );
};

export default UserDataClient;
