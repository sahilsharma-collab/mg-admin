"use client";
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLogout, IconUser } from '@tabler/icons-react';
import { LogoutConfirmationModal } from './LogoutConfirmationModal';
import { useUserProfile } from '@/context/UserProfileContext';

const UserDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { user, loading, logout } = useUserProfile();

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

    const handleLogout = () => {
        try {
            logout();
            setIsOpen(false);
            setIsLogoutModalOpen(false);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                aria-label="User menu"
            >
                {user?.imgUrl ? (
                    <div className='h-7 w-7 rounded-full overflow-hidden'>
                        <img 
                            src={user.imgUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                ) : (
                    <div className='h-7 w-7 bg-gray-300 rounded-full'></div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                    >
                        {/* User info */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                {user?.imgUrl ? (
                                    <div className='h-8 w-8 rounded-full overflow-hidden'>
                                        <img 
                                            src={user.imgUrl} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className='h-8 w-8 bg-gray-300 rounded-full'></div>
                                )}
                                <div>
                                    <p className="font-medium text-sm dark:text-white">
                                        {loading ? 'Loading...' : user?.name || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {loading ? 'loading@example.com' : user?.email || 'No email'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                            <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                                onClick={() => {
                                    router.push('/update-profile');
                                    setIsOpen(false);
                                }}
                            >
                                <IconUser className="h-4 w-4" />
                                Profile
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                                onClick={() => setIsLogoutModalOpen(true)}
                            >
                                <IconLogout className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
        </div>
    );
};

export default UserDropdown;