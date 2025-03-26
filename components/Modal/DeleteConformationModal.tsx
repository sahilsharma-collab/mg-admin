"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    warningNote?: string;
}

export const DeleteConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    loading,
    warningNote,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-full max-w-lg mx-auto"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                                <h3 className="text-lg font-semibold">Are you sure?</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">You won&apos;t be able to revert this!</p>

                        {warningNote && (
                            <div className="flex items-start gap-2 p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 break-words whitespace-normal">
                                    {warningNote}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={onConfirm}
                                disabled={loading}
                                className="w-full sm:w-auto hover:bg-red-800 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting</span>
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