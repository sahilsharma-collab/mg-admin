"use client";
import { DataTable } from "@/components/ui/data-table";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { columns, IssueColumn, IssueResponseColumn } from "./columns";
import { Row } from "@tanstack/react-table";
import { toast } from "react-toastify";
import Image from "next/image";
import { CellAction } from "./cell-actions";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// Update the interface to include raw date fields
export interface EnhancedIssueColumn extends IssueColumn {
  createdAtRaw: Date;
  updatedAtRaw: Date;
}

const IssuesClient = () => {
  const [formattedIssues, setFormattedIssues] = useState<EnhancedIssueColumn[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const token = Cookies.get("auth_token");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/issue`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();

        const formatDateTime = (dateString: string) => {
          const date = new Date(dateString);
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        };

        const formattedData: EnhancedIssueColumn[] = data.issues.map(
          (issue: IssueResponseColumn) => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            image: issue.imgUrl,
            userName: issue.user.name,
            userEmail: issue.user.email,
            status: issue.status,
            remarks: issue.remarks,
            createdAt: formatDateTime(issue.createdAt),
            updatedAt: formatDateTime(issue.updatedAt),
            // Add raw date objects for filtering
            createdAtRaw: new Date(issue.createdAt),
            updatedAtRaw: new Date(issue.updatedAt),
          })
        );

        setFormattedIssues(formattedData);
      } catch (error) {
        console.error("Error fetching reported issues:", error);
        toast.error("Failed to load reported issues");
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [refreshCounter, token]);

  const refreshData = () => setRefreshCounter((prev) => prev + 1);

  // Excel export function
  const exportToExcel = () => {
    try {
      // Prepare data for export (exclude unnecessary fields)
      const exportData = formattedIssues.map((issue) => ({
        "Issue ID": issue.id,
        Title: issue.title,
        Description: issue.description,
        "User Name": issue.userName,
        "User Email": issue.userEmail,
        Status: issue.status,
        Remarks: issue.remarks || "N/A",
        "Created At": issue.createdAt,
        "Updated At": issue.updatedAt,
        "Image URL": issue.image || "No image",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 10 }, // Issue ID
        { wch: 25 }, // Title
        { wch: 40 }, // Description
        { wch: 20 }, // User Name
        { wch: 25 }, // User Email
        { wch: 12 }, // Status
        { wch: 30 }, // Remarks
        { wch: 18 }, // Created At
        { wch: 18 }, // Updated At
        { wch: 30 }, // Image URL
      ];
      ws["!cols"] = colWidths;

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Reported Issues");

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `reported-issues-${currentDate}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      toast.success(`Excel file "${filename}" downloaded successfully!`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export data to Excel");
    }
  };

  const columnsWithActions = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: { row: Row<EnhancedIssueColumn> }) => (
          <CellAction data={row.original} onRefresh={refreshData} />
        ),
      };
    }
    if (col.id === "image") {
      return {
        ...col,
        cell: ({ row }: { row: Row<EnhancedIssueColumn> }) =>
          row.original.image ? (
            <div className="w-20 h-20 relative">
              <Image
                src={row.original.image}
                alt="Issue screenshot"
                fill
                className="object-cover rounded"
              />
            </div>
          ) : (
            <span className="text-gray-400">No image</span>
          ),
      };
    }
    if (col.id === "status") {
      return {
        ...col,
        cell: ({ row }: { row: Row<EnhancedIssueColumn> }) => {
          let statusClass = "";
          switch (row.original.status) {
            case "PENDING":
              statusClass = "bg-yellow-100 text-yellow-800";
              break;
            case "RESOLVED":
              statusClass = "bg-green-100 text-green-800";
              break;
            case "REJECTED":
              statusClass = "bg-red-100 text-red-800";
              break;
            default:
              statusClass = "bg-gray-100 text-gray-800";
          }
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
            >
              {row.original.status}
            </span>
          );
        },
      };
    }
    return col;
  });

  return (
    <div className="container-padding">
      <DataTable
        redirectUrl=""
        searchKey={["title", "userEmail"]}
        columns={columnsWithActions}
        data={formattedIssues}
        loading={loading}
        title={
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold">Reported Issues</h1>
            <Button
              onClick={exportToExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={loading || formattedIssues.length === 0}
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        }
        enableDateFilter={true}
      />
    </div>
  );
};

export default IssuesClient;
