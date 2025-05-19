"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  const [refreshCounter, setRefreshCounter] = useState(0);
  const token = Cookies.get("auth_token");
  const { page, limit, setPage, setLimit, resetPagination } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch data when pagination or search changes
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile/paginated/all`
      );
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      if (searchQuery) {
        url.searchParams.append("query", searchQuery);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        )}`;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedData: UserColumn[] = data.users.map((user: any) => ({
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
      }));

      setFormattedUsers(formattedData);
      setTotalUsers(data.pagination.totalUsers);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, token]);

  useEffect(() => {
    if (isInitialized) {
      fetchUsers();
    }
  }, [fetchUsers, isInitialized, token, refreshCounter]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  // useEffect(() => {
  //   if (isInitialized) {
  //     fetchUsers();
  //   }
  // }, [page, limit, isInitialized, token, refreshCounter]);
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
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
          <CellAction data={row.original} onSuccess={refreshData} />
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
        onSearch={handleSearch}
        searchPlaceholder="Search by email"
      />
    </div>
  );
};

export default UserDataClient;
