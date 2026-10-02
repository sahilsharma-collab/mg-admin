"use client";
import { DataTable } from "@/components/ui/data-table";
import React, { useEffect, useState } from "react";
import { columns, IssueColumn, IssueResponseColumn } from "./columns";
import { Row } from "@tanstack/react-table";
import { toast } from "react-toastify";
import Image from "next/image";
import { CellAction } from "./cell-actions";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toCsv } from "@/lib/csv";

// Update the interface to include raw date fields
export interface EnhancedIssueColumn extends IssueColumn {
  createdAtRaw: Date;
  updatedAtRaw: Date;
}

/**
 * Headers and readers for the reported-issues export, in file order.
 *
 * Issue titles, descriptions and remarks are free text, so they hold quotes,
 * commas and newlines — and, just as easily, a leading `=` that a spreadsheet
 * would execute. This file used to double quotes inline, which fixed the first
 * problem and not the second; `toCsv` fixes both (see lib/csv.ts).
 */
const ISSUE_CSV_COLUMNS = [
  ["Issue ID", (i: IssueColumn) => i.id],
  ["Title", (i: IssueColumn) => i.title],
  ["Description", (i: IssueColumn) => i.description],
  ["User Name", (i: IssueColumn) => i.userName],
  ["User Email", (i: IssueColumn) => i.userEmail],
  ["Status", (i: IssueColumn) => i.status],
  ["Remarks", (i: IssueColumn) => i.remarks || "N/A"],
  ["Created At", (i: IssueColumn) => i.createdAt],
  ["Updated At", (i: IssueColumn) => i.updatedAt],
  ["Image URL", (i: IssueColumn) => i.image || "No image"],
] as const;

/** The exact file the export button writes. Exported so tests can parse it. */
export function buildIssuesCsv(issues: readonly IssueColumn[]): string {
  return toCsv([
    ISSUE_CSV_COLUMNS.map(([header]) => header),
    ...issues.map((issue) => ISSUE_CSV_COLUMNS.map(([, read]) => read(issue))),
  ]);
}

const IssuesClient = () => {
  const [formattedIssues, setFormattedIssues] = useState<EnhancedIssueColumn[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(
          "/api/issue",
          {
            method: "GET",
            headers: {
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
  }, [refreshCounter]);

  const refreshData = () => setRefreshCounter((prev) => prev + 1);

  // P2-9. This used the `xlsx` package, which is unmaintained on npm and
  // carries unfixed prototype-pollution and ReDoS advisories. The exploit path
  // is in its *parser* and this code only writes, so the practical risk was
  // low — but the dependency is dead, and every other export in this panel
  // (users, payments, renewals) already builds a CSV with no library at all.
  // This one now matches them, and the package is gone. All five now share
  // lib/csv.ts rather than each carrying their own escaping.
  const exportToCsv = () => {
    try {
      const csv = buildIssuesCsv(formattedIssues);

      const filename = `reported-issues-${new Date().toISOString().split("T")[0]}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`"${filename}" downloaded successfully!`);
    } catch (error) {
      console.error("Error exporting issues:", error);
      toast.error("Failed to export data");
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
              onClick={exportToCsv}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={loading || formattedIssues.length === 0}
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        }
        enableDateFilter={true}
      />
    </div>
  );
};

export default IssuesClient;
