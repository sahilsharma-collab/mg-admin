"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import React from "react";
import { columns, NotificationColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
import { useNotifications } from "@/context/NotificationContext";
import { AddNotificationModal } from "./AddNotificationModal";

const NotificationsClient = () => {
  const {
    originalNotifications,
    unreadCount,
    loading,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

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

  const formattedNotifications: NotificationColumn[] =
    originalNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message.slice(0, 30) + "...",
      createdAt: formatDateTime(notification.createdAt),
    }));

  const columnsWithActions = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: { row: Row<NotificationColumn> }) => (
          <CellAction
            data={row.original}
            deleteNotification={(id) =>
              deleteNotification(id).then(() => refreshNotifications())
            }
          />
        ),
      };
    }
    return col;
  });

  return (
    <div className="container-padding">
      <DataTable
        redirectUrl=""
        searchKey="title"
        columns={columnsWithActions}
        data={formattedNotifications}
        loading={loading}
        title={
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                {unreadCount} unread
              </span>
            )}
          </div>
        }
        actionButton={
          <>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white mr-5"
            >
              Add Notification
            </Button>
          </>
        }
      />

      <AddNotificationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onNotificationAdded={refreshNotifications}
      />
    </div>
  );
};

export default NotificationsClient;
