"use client"
import React, { useState, useEffect } from 'react';
import { IconUsers, IconUserBolt, IconUserCheck, IconUserExclamation } from '@tabler/icons-react';
import UserChart from '../Chart/UserChart';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    exnessVerifiedUsers: number;
    guestUsers: number;
}

interface MonthlyStat {
    month: string;
    totalUsers: number;
    activeUsers: number;
    exnessVerifiedUsers: number;
    guestUsers: number;
}

const HomePage = () => {
    const [statsLoading, setStatsLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
    const token = Cookies.get('auth_token');

    // Fetch dashboard stats independently
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setStatsLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/admin/dashboard-stats`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`Error fetching dashboard stats: ${response.statusText}`);
                const data = await response.json();
                setStats(data.stats);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                toast.error("Failed to load dashboard stats");
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    // Fetch monthly stats independently
    useEffect(() => {
        const fetchMonthlyStats = async () => {
            try {
                setChartLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_PROD_URL}/api/admin/monthly-stats`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`Error fetching monthly stats: ${response.statusText}`);
                const data = await response.json();
                setMonthlyStats(data.monthlyStats);
            } catch (error) {
                console.error("Error fetching monthly stats:", error);
                toast.error("Failed to load chart data");
            } finally {
                setChartLoading(false);
            }
        };

        fetchMonthlyStats();
    }, [token]);

    return (
        <main className='container-padding mt-4 space-y-7'>
            {/* Users Section */}
            <section className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
                {statsLoading ? (
                    <div className="flex justify-center items-center col-span-4 space-x-2 bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl w-full h-[6.35rem]">
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                    </div>
                ) : (
                    stats && (
                        <>
                            <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                                <span className='flex justify-between'>
                                    <h2 className='font-medium dark:text-[#B3A5C6]'>Total Users</h2>
                                    <IconUsers stroke={2} className='dark:text-[#B3A5C6]' />
                                </span>
                                <p className='font-semibold text-3xl'>{stats.totalUsers}</p>
                            </div>
                            <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                                <span className='flex justify-between'>
                                    <h2 className='font-medium dark:text-[#B3A5C6]'>Active Users</h2>
                                    <IconUserBolt stroke={2} className='dark:text-[#B3A5C6]' />
                                </span>
                                <p className='font-semibold text-3xl'>{stats.activeUsers}</p>
                            </div>
                            <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                                <span className='flex justify-between'>
                                    <h2 className='font-medium dark:text-[#B3A5C6]'>Verified Users</h2>
                                    <IconUserCheck stroke={2} className='dark:text-[#B3A5C6]' />
                                </span>
                                <p className='font-semibold text-3xl'>{stats.exnessVerifiedUsers}</p>
                            </div>
                            <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                                <span className='flex justify-between'>
                                    <h2 className='font-medium dark:text-[#B3A5C6]'>Guest Users</h2>
                                    <IconUserExclamation stroke={2} className='dark:text-[#B3A5C6]' />
                                </span>
                                <p className='font-semibold text-3xl'>{stats.guestUsers}</p>
                            </div>
                        </>
                    )
                )}
            </section>

            {/* Chart Section*/}
            <section>
                {chartLoading ? (
                    <div className="flex justify-center items-center space-x-2 bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl" style={{ width: '100%', height: 450 }}>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                    </div>
                ) : (
                    <UserChart monthlyStats={monthlyStats} />
                )}
            </section>
        </main>
    );
};

export default HomePage;