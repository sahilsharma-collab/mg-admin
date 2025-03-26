"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MarkAllAsReadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onConfirm: () => Promise<void>;
}

export const MarkAllAsReadModal: React.FC<MarkAllAsReadModalProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error in modal confirmation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-[90%] max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MailCheck className="h-6 w-6 text-blue-500" />
                <h3 className="text-lg font-semibold">Mark All as Read</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You are about to mark <span className="font-semibold">{unreadCount}</span> unread notification(s) as read.
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-[#0ABAB5] hover:bg-[#089e99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing</span>
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};