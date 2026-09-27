"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";
import { useUserProfile } from "@/context/UserProfileContext";

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

export interface OriginalNotification {
  id: number;
  title: string;
  message: string;
  route: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  originalNotifications: OriginalNotification[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => void;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchOriginalNotifications: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [originalNotifications, setOriginalNotifications] = useState<
    OriginalNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  // Polling runs every 10 seconds for as long as the panel is open, so it must
  // not run at all while signed out — on /login that would be a 401 every tick.
  const { user } = useUserProfile();

  const refreshNotifications = () => setRefreshCounter((prev) => prev + 1);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await apiFetch(
        "/api/notification/get-notification",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

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

  const fetchOriginalNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await apiFetch(
        "/api/notification/get-all-notification",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const data = await response.json();
      setOriginalNotifications(data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight check for new notifications (only counts unread)
  const checkForNewNotifications = async () => {
    if (!user) return unreadCount;

    try {
      const response = await apiFetch(
        "/api/notification/get-notification",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const data = await response.json();
      return data.unreadCount;
    } catch (error) {
      console.error("Error checking for new notifications:", error);
      return unreadCount;
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const response = await apiFetch(
        `/api/notification/read-notification/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      toast.success("Notification marked as read.");
      refreshNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiFetch(
        "/api/notification/read-all-notification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      toast.success("All notifications marked as read");
      refreshNotifications();
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const response = await apiFetch(
        `/api/notification/delete/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      toast.success("Notification deleted successfully.");
      refreshNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  // Polling effect
  useEffect(() => {
    if (!user) return;

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
  }, [unreadCount, user]);

  useEffect(() => {
    fetchNotifications();
    fetchOriginalNotifications();
  }, [refreshCounter, user]);

  return (
    <NotificationContext.Provider
      value={{
        originalNotifications,
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        fetchOriginalNotifications,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
