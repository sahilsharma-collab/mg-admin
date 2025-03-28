"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

export interface Notification {
    id: number;
    userId: number;
    notificationId: number;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
    notification: {
        id: number;
        title: string;
        message: string;
        route: string;
        createdAt: string;
        updatedAt: string;
    };
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    refreshNotifications: () => void;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const token = Cookies.get('auth_token');

    const refreshNotifications = () => setRefreshCounter(prev => prev + 1);

    const fetchNotifications = async () => {
        if (!token) return;

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
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    // Lightweight check for new notifications (only counts unread)
    const checkForNewNotifications = async () => {
        if (!token) return unreadCount;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/notification/get-notification`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const data = await response.json();
            return data.unreadCount;
        } catch (error) {
            console.error("Error checking for new notifications:", error);
            return unreadCount;
        }
    };

    const markAsRead = async (id: number) => {
        console.log("sdfdsfsdfsdf", id)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/notification/read-notification/${id}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) throw new Error(`Error: ${response.statusText}`);
            toast.success('Notification marked as read.');
            refreshNotifications();
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
            refreshNotifications();
        } catch (error) {
            toast.error("Failed to mark all notifications as read");
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Polling effect
    useEffect(() => {
        if (!token) return;

        const POLLING_INTERVAL = 10000; // 10 seconds

        const poll = async () => {
            const currentUnreadCount = await checkForNewNotifications();
            if (currentUnreadCount > unreadCount) {
                // Only refresh if there are new unread notifications
                refreshNotifications();
            }
        };

        const intervalId = setInterval(poll, POLLING_INTERVAL);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [token, unreadCount]);

    useEffect(() => {
        fetchNotifications();
    }, [refreshCounter, token]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refreshNotifications,
            markAsRead,
            markAllAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};