"use client";
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { columns, NotificationColumn, NotificationResponseColumn } from './columns';
import { CellAction } from './cell-actions';
import { Row } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { MarkAllAsReadModal } from './MarkAllAsReadModal';

const NotificationsClient = () => {
    const [formattedNotifications, setFormattedNotifications] = useState<NotificationColumn[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const token = Cookies.get('auth_token');
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [isMarkAllModalOpen, setIsMarkAllModalOpen] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/notification/get-notification`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                const data = await response.json();

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

                const formattedData: NotificationColumn[] = data.notifications.map((notification: NotificationResponseColumn) => ({
                    id: notification.id,
                    title: notification.notification.title,
                    message: notification.notification.message,
                    isRead: notification.isRead,
                    createdAt: formatDateTime(notification.createdAt),
                    readAt: notification.readAt ? formatDateTime(notification.readAt) : null,
                }));

                setFormattedNotifications(formattedData);
                setUnreadCount(data.unreadCount);
            } catch (error) {
                console.error("Error fetching notifications:", error);
                toast.error("Failed to load notifications");
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [refreshCounter, token]);

    const refreshData = () => setRefreshCounter(prev => prev + 1);

    const markAsRead = async (id: number) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/notification/read-notification/${id}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            refreshData();
        } catch (error) {
            console.error("Error marking notification as read:", error);
            toast.error("Failed to mark notification as read");
            throw error;
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/notification/read-all-notification`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            toast.success("All notifications marked as read");
            refreshData();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            toast.error("Failed to mark all notifications as read");
            throw error;
        }
    };

    const columnsWithActions = columns.map(col => {
        if (col.id === "actions") {
            return {
                ...col,
                cell: ({ row }: { row: Row<NotificationColumn> }) => (
                    <CellAction data={row.original} onMarkAsRead={markAsRead} />
                ),
            };
        }
        return col;
    });

    const handleMarkAllRead = () => {
        if (unreadCount === 0) {
            toast.info('No unread notifications to mark')
        } else {
            setIsMarkAllModalOpen(true)
        }
    }

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
                onConfirm={markAllAsRead}
            />
        </div>
    );
};

export default NotificationsClient;