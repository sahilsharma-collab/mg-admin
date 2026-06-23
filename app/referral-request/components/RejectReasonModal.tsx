"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  /** How many requests are being rejected (1 for single reject). */
  count?: number;
}

export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  count = 1,
}) => {
  const [reason, setReason] = useState("");

  // Reset the field each time the modal opens.
  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setReason(e.target.value);

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
            className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-[90%] max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h3 className="text-lg font-semibold">
                  Reject Request{count > 1 ? "s" : ""}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={loading}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 break-words whitespace-normal">
              You are about to reject{" "}
              <span className="font-semibold">{count}</span> request
              {count > 1 ? "s" : ""}. Optionally add a reason — it will be sent
              to the user in the rejection notification and email.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Reason for rejection{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={reason}
                onChange={handleChange}
                placeholder="Add a reason (optional). Leave blank to use the default message."
                className="min-h-[100px]"
                maxLength={1000}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={() => onConfirm(reason.trim())}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
