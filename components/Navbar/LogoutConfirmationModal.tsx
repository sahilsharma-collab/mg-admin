"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LogoutConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            onClose();
        }
    };

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
                                <LogOut className="h-6 w-6 text-red-500" />
                                <h3 className="text-lg font-semibold">Log Out</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to log out of your account?
                        </p>

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
                                onClick={handleLogout}
                                disabled={loading}
                                className="w-full sm:w-auto hover:bg-red-800 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Logging Out</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-4 w-4" />
                                        <span>Log Out</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};