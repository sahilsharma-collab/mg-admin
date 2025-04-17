"use client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import React from "react";
import { columns, NotificationColumn } from "./columns";
import { CellAction } from "./cell-actions";
import { Row } from "@tanstack/react-table";
// import { toast } from "react-toastify";
import { MarkAllAsReadModal } from "./MarkAllAsReadModal";
import { useNotifications } from "@/context/NotificationContext";
import { AddNotificationModal } from "./AddNotificationModal";

const NotificationsClient = () => {
  const {
    originalNotifications,
    unreadCount,
    loading,
    deleteNotification,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const [isMarkAllModalOpen, setIsMarkAllModalOpen] = React.useState(false);
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
      message: notification.message,
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

  // const handleMarkAllRead = () => {
  //   if (unreadCount === 0) {
  //     toast.info("No unread notifications to mark");
  //   } else {
  //     setIsMarkAllModalOpen(true);
  //   }
  // };

  const handleConfirmMarkAll = async () => {
    try {
      await markAllAsRead();
      refreshNotifications();
      setIsMarkAllModalOpen(false);
    } catch (error) {
      console.log("Error marking all notifications as read:", error);
    }
  };

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
            {/* <Button
              onClick={handleMarkAllRead}
              className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
            >
              Mark All as Read
            </Button> */}
          </>
        }
      />

      <MarkAllAsReadModal
        isOpen={isMarkAllModalOpen}
        onClose={() => setIsMarkAllModalOpen(false)}
        unreadCount={unreadCount}
        onConfirm={handleConfirmMarkAll}
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
