"use client";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { columns, UserColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePagination } from "@/context/pagination-context";
import { DataTableWithApiPagination } from "@/components/ui/data-table2";

const UserDataClient = () => {
  const [formattedUsers, setFormattedUsers] = useState<UserColumn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // Added refresh counter
  const token = Cookies.get("auth_token");
  const { page, limit, setPage, setLimit, resetPagination } = usePagination();

  // Handle initial loading only once
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        resetPagination();
        setIsInitialized(true);
      }
    };
    initialize();
  }, [isInitialized, resetPagination]);

  // Fetch data when pagination changes or refresh counter changes
  useEffect(() => {
    if (isInitialized) {
      fetchUsers();
    }
  }, [page, limit, isInitialized, token, refreshCounter]); // Added refreshCounter to dependencies

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile/paginated/all?page=${page}&limit=${limit}`,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          exnessId: user.exnessId || "",
          createdAt: formatDateTime(user.createdAt),
          updatedAt: formatDateTime(user.updatedAt),
          exnessVerified: user.exnessVerified || false,
          emailVerified: user.emailVerified || false,
          createdAtRaw: new Date(user.createdAt),
          updatedAtRaw: new Date(user.updatedAt),
        })
      );

      setFormattedUsers(formattedData);
      setTotalUsers(data.pagination.totalUsers);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh function to increment counter
  const refreshData = () => {
    setRefreshCounter(prev => prev + 1);
  };

  const downloadCSV = () => {
    let csv = "ID,Name,Email,Role,Created At,Updated At\n";
    formattedUsers.forEach((user) => {
      csv += `"${user.id}","${user.name}","${user.email}","${user.role}","${user.createdAt}","${user.updatedAt}"\n`;
    });

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
          <CellAction
            data={row.original}
            onSuccess={() => {
              refreshData(); // Use refreshData instead of just setPage(1)
            }}
          />
        ),
      };
    }
    return col;
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <div className="container-padding">
      <DataTableWithApiPagination
        redirectUrl=""
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
        totalItems={totalUsers}
        totalPages={totalPages}
        currentPage={page}
        itemsPerPage={limit}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleLimitChange}
        searchConfig={{
          apiPath: "/api/profile/search",
          placeholder: "Search by email",
          searchKey: "query",
          supportsPagination: true
        }}
      />
    </div>
  );
};

export default UserDataClient;