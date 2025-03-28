"use client";

import { IconBellFilled } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { Notification, useNotifications } from '@/context/NotificationContext';
import { Mail } from 'lucide-react';
import { MarkAllAsReadModal } from '@/app/notifications/components/MarkAllAsReadModal';
import { toast } from 'react-toastify';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkAllModalOpen, setIsMarkAllModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  // Filter to only show unread notifications in dropdown
  const unreadNotifications = notifications.filter(n => !n.isRead);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification?.id);
    // setIsOpen(false);
  };

  const handleMarkAllReadClick = () => {
    if (unreadCount === 0) {
      toast.info('No unread notifications to mark');
      return;
    }
    setIsMarkAllModalOpen(true);
  };

  const handleConfirmMarkAll = async () => {
    try {
      await markAllAsRead();
      refreshNotifications();
      setIsMarkAllModalOpen(false);
    } catch (error) {
      console.log(error)
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer"
        aria-label="Notifications"
      >
        <IconBellFilled className="h-10 w-10 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mt-1.5 dark:text-[#B3A5C6]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0 -right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 md:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
              <h3 className="font-semibold text-lg dark:text-white">Notifications</h3>
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading notifications...
                </div>
              ) : unreadNotifications.length > 0 ? (
                unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <h4 className="font-medium text-sm dark:text-white">{notification.notification.title}</h4>
                    {notification.notification.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No unread notifications
                </div>
              )}
            </div>

            <div className='p-3 items-center border-t border-gray-200 dark:border-gray-700 text-center'>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllReadClick}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline "
                >
                  Mark all as read
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MarkAllAsReadModal
        isOpen={isMarkAllModalOpen}
        onClose={() => setIsMarkAllModalOpen(false)}
        unreadCount={unreadCount}
        onConfirm={handleConfirmMarkAll}
      />
    </div>
  );
};

export default NotificationDropdown;