"use client";

import React, { useState } from 'react';
import { IconMenu2 } from '@tabler/icons-react';
import { cn } from "@/lib/utils";
import Sidebar from '../Sidebar/Sidebar';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggleButton';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';

const Navbar = () => {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    if (isLoginPage) {
        return null;
    }

    return (
        <>
            <section className='w-full flex justify-between xl:justify-end pt-4 px-4 md:px-10'>
                <div className='flex items-center xl:hidden'>
                    <IconMenu2
                        className="h-7 w-7 cursor-pointer text-gray-700 dark:text-[#B3A5C6]"
                        onClick={toggleMobileSidebar}
                    />
                </div>
                <div className='flex gap-2 items-center'>
                    <ThemeToggle />
                    <NotificationDropdown />
                    <UserDropdown />
                </div>
            </section>

            <div
                className={cn(
                    "fixed top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out transform xl:hidden",
                    isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <Sidebar onClose={toggleMobileSidebar} />
            </div>
        </>
    );
};

export default Navbar;