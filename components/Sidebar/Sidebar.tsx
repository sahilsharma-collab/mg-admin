"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconLayoutDashboard, IconChartArcs3, IconMessages, IconChartAreaLine, IconCalendarEvent, IconDeviceAnalytics, IconUserSquareRounded, IconBell, IconQuestionMark, IconFileBroken, IconCrown, IconChevronDown, IconBrandYoutube, IconUsers, IconFocus } from '@tabler/icons-react';

interface SidebarProps {
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    const routes = [
        {
            href: "/",
            label: "Dashboard",
            icon: <IconLayoutDashboard stroke={2} />
        },
        {
            href: "/market-analysis",
            label: "Market Analysis",
            icon: <IconLayoutDashboard stroke={2} />
        },
        {
            href: "/trader-community",
            label: "Traders Community",
            icon: <IconChartArcs3 stroke={2} />,
            subLinks: [
                {
                    href: "/trader-community/get-all",
                    label: "All Post",
                },
                {
                    href: "/trader-community/get-my-post",
                    label: "My Post",
                },
            ],
        },
        {
            href: "/live-trade",
            label: "Live Trades",
            icon: <IconChartAreaLine stroke={2} />
        },
        {
            href: "/events",
            label: "Events",
            icon: <IconCalendarEvent stroke={2} />
        },
        {
            href: "/youtube",
            label: "Youtube",
            icon: <IconBrandYoutube stroke={2} />,
            subLinks: [
                {
                    href: "/youtube/general",
                    label: "General Vedio",
                },
                {
                    href: "/youtube/tutorial",
                    label: "Tutorial Vedio",
                }
            ]
        },
        {
            href: "/reported-issues",
            label: "Reported Issues",
            icon: <IconMessages stroke={2} />
        },
        {
            href: "/referral-request",
            label: "Referral Requests",
            icon: <IconDeviceAnalytics stroke={2} />
        },
        {
            href: "/community-request",
            label: "Community Requests",
            icon: <IconUsers stroke={2} />,
            subLinks: [
                {
                    href: "/community-request/post",
                    label: "Post Requests",
                },
                {
                    href: "/community-request/reply",
                    label: "Reply Requests",
                },
            ],
        },
        {
            href: "/users",
            label: "Users",
            icon: <IconUserSquareRounded stroke={2} />
        },
        {
            href: "/notifications",
            label: "Notifications",
            icon: <IconBell stroke={2} />
        },
        {
            href: "/faq",
            label: "FAQ",
            icon: <IconQuestionMark stroke={2} />
        },
        {
            href: "/pages",
            label: "Pages",
            icon: <IconFileBroken stroke={2} />
        },
        {
            href: "/roles-and-admins",
            label: "Roles and Admins",
            icon: <IconCrown stroke={2} />
        },
    ];

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    const handleMouseEnter = () => {
        if (!isExpanded) {
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isExpanded) {
            setIsHovered(false);
        }
    };

    const toggleDropdown = (href: string) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [href]: !prev[href]
        }));
    };

    if (isLoginPage) {
        return null;
    }

    return (
        <>
            <motion.aside
                className={cn(
                    "h-screen bg-[#DBE7F7] text-white p-4 flex flex-col transition-all shadow-xl border fixed z-10",
                )}
                animate={{
                    width: isExpanded ? "18rem" : isHovered ? "18rem" : "5.5rem",
                }}
                transition={{ duration: 0.3 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-center justify-between px-2">
                    <div className="h-[70px] flex items-center">
                        <Link href="/">
                            <div className="flex items-center">
                                <Image
                                    src="/Images/logo.svg"
                                    height={40}
                                    width={40}
                                    alt="logo"
                                />

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key="logo-text"
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <Image
                                            src="/Images/logo-text.svg"
                                            height={80}
                                            width={80}
                                            alt="logo-text"
                                            className="ml-2 mt-2"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </Link>
                    </div>

                    {(isExpanded || isHovered) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                duration: 0.3,
                                delay: 0.3,
                            }}
                            className="hidden xl:block"
                        >
                            {/* Toggle Button */}
                            <button
                                onClick={toggleSidebar}
                                className="mt-1 w-4 h-4 rounded-full border-[#353535] border-2 flex items-center justify-center self-end cursor-pointer"
                            >
                                <motion.div
                                    animate={{
                                        scale: isExpanded ? 0.8 : 1,
                                        backgroundColor: isExpanded ? "#353535" : "#DBE7F7",
                                    }}
                                    transition={{
                                        duration: 0.3,
                                    }}
                                    className="w-2 h-2 rounded-full bg-[#353535]"
                                />
                            </button>
                        </motion.div>
                    )}

                    <IconX
                        className="h-6 w-6 cursor-pointer text-gray-700 block xl:hidden"
                        onClick={onClose}
                    />
                </div>

                {/* Sidebar Links */}
                <nav className="mt-3 space-y-2 flex-1 overflow-y-auto scrollbar-none">
                    {routes.map((route) => {
                        const isActive =
                            pathname === route.href ||
                            (pathname.startsWith(route.href) && route.href !== "/");

                        const isDropdownOpen = !!openDropdowns[route.href];

                        return (
                            <div key={route.href}>
                                <Link
                                    href={route.href}
                                    className={cn(
                                        "flex items-center py-2 px-3 font-semibold rounded-md transition-all hover:bg-[#353535] hover:text-white whitespace-nowrap",
                                        isActive ? "bg-[#353535] font-medium text-white" : "text-[#353535]",
                                    )}
                                    onClick={(e) => {
                                        if (route.subLinks) {
                                            e.preventDefault();
                                            toggleDropdown(route.href);
                                        } else {
                                            onClose?.();
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <div className={cn("flex items-center justify-center w-6 h-6")}>
                                            {route.icon}
                                        </div>
                                        <AnimatePresence>
                                            {(isExpanded || isHovered) && (
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2, delay: 0.3 }}
                                                    className="ml-3"
                                                >
                                                    {route.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {route.subLinks && (isExpanded || isHovered) && (
                                        <div className="ml-auto">
                                            <motion.div
                                                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex items-center justify-center "
                                            >
                                                <IconChevronDown size={18} stroke={2} />
                                            </motion.div>
                                        </div>
                                    )}
                                </Link>

                                {route.subLinks && (
                                    <AnimatePresence mode="wait">
                                        {isDropdownOpen && (isExpanded || isHovered) && (
                                            <motion.div
                                                key="sublinks-container"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="pl-8 overflow-hidden"
                                            >
                                                {route.subLinks.map((subLink) => (
                                                    <Link
                                                        key={subLink.href}
                                                        href={subLink.href}
                                                        className={cn(
                                                            "flex items-center py-2 px-3 font-semibold my-1 rounded-md transition-all hover:bg-[#353535] hover:text-white whitespace-nowrap",
                                                            pathname === subLink.href ? "bg-[#353535] font-medium text-white" : "text-[#353535]",
                                                        )}
                                                        onClick={onClose}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconFocus className="inline-block w-3.5 h-3.5 mr-2" stroke={3}/>
                                                            {subLink.label}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        );
                    })}
                </nav>

            </motion.aside>
            <motion.div
                className={`h-full`}
                animate={{
                    width: isExpanded ? "18rem" : "5.3rem",
                }}
            >
            </motion.div>
        </>
    );
}

export default Sidebar;