"use client";
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import React from 'react';
import { columns, NotificationColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { MarkAllAsReadModal } from './MarkAllAsReadModal';
import { useNotifications } from '@/context/NotificationContext';

const NotificationsClient = () => {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications
    } = useNotifications();

    const [isMarkAllModalOpen, setIsMarkAllModalOpen] = React.useState(false);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formattedNotifications: NotificationColumn[] = notifications.map(notification => ({
        id: notification.id,
        title: notification.notification.title,
        message: notification.notification.message,
        isRead: notification.isRead,
        createdAt: formatDateTime(notification.createdAt),
        readAt: notification.readAt ? formatDateTime(notification.readAt) : null,
    }));

    const columnsWithActions = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<NotificationColumn> }) => (
                    <CellAction 
                        data={row.original} 
                        onMarkAsRead={(id) => markAsRead(id).then(() => refreshNotifications())}
                    />
                ),
            };
        }
        return col;
    });

    const handleMarkAllRead = () => {
        if (unreadCount === 0) {
            toast.info('No unread notifications to mark');
        } else {
            setIsMarkAllModalOpen(true);
        }
    };

    const handleConfirmMarkAll = async () => {
        try {
            await markAllAsRead();
            refreshNotifications();
            setIsMarkAllModalOpen(false);
        } catch (error) {
            console.log("Error marking all notifications as read:", error)
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
                    <Button
                        onClick={handleMarkAllRead}
                        className="bg-[#0ABAB5] rounded-full px-6 hover:bg-[#089e99] transition-colors dark:text-white"
                    >
                        Mark All as Read
                    </Button>
                }
            />

            <MarkAllAsReadModal
                isOpen={isMarkAllModalOpen}
                onClose={() => setIsMarkAllModalOpen(false)}
                unreadCount={unreadCount}
                onConfirm={handleConfirmMarkAll}
            />
        </div>
    );
};

export default NotificationsClient;