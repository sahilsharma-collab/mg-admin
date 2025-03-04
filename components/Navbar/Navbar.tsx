"use client";

import React, { useState } from 'react';
import { IconBellFilled, IconMenu2 } from '@tabler/icons-react';
import { cn } from "@/lib/utils";
import Sidebar from '../Sidebar/Sidebar';

const Navbar = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    return (
        <>
            <section className='w-full flex justify-between xl:justify-end pt-4 px-4 md:px-10'>
                <div className='flex items-center xl:hidden'>
                    <IconMenu2
                        className="h-7 w-7 cursor-pointer text-gray-700"
                        onClick={toggleMobileSidebar}
                    />
                </div>
                <div className='flex gap-4 items-center'>
                    <IconBellFilled className="h-8 w-8" />
                    <div className='h-6 md:h-7 w-6 md:w-7 bg-gray-300 rounded-full'></div>
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