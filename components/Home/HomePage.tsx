"use client"
import React, { useState, useEffect } from 'react';
import { IconUsers, IconUserBolt, IconUserCheck, IconUserExclamation } from '@tabler/icons-react';
import UserChart from '../Chart/UserChart';

const HomePage = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulating API call delay
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <main className='container-padding mt-4 space-y-7'>

            {/* Users Section */}
            <section className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
                {loading ? (
                    <div className="flex justify-center items-center col-span-4 space-x-2 bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl w-full h-[6.35rem]">
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                    </div>
                ) : (
                    <>
                        <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                            <span className='flex justify-between'>
                                <h2 className='font-medium dark:text-[#B3A5C6]'>Total Users</h2>
                                <IconUsers stroke={2} className='dark:text-[#B3A5C6]'/>
                            </span>
                            <p className='font-semibold text-3xl'>14273</p>
                        </div>
                        <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                            <span className='flex justify-between'>
                                <h2 className='font-medium dark:text-[#B3A5C6]'>Active Users</h2>
                                <IconUserBolt stroke={2} className='dark:text-[#B3A5C6]'/>
                            </span>
                            <p className='font-semibold text-3xl'>14273</p>
                        </div>
                        <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                            <span className='flex justify-between'>
                                <h2 className='font-medium dark:text-[#B3A5C6]'>Approved Users</h2>
                                <IconUserCheck stroke={2} className='dark:text-[#B3A5C6]'/>
                            </span>
                            <p className='font-semibold text-3xl'>14273</p>
                        </div>
                        <div className='bg-[#4A87D833] border border-[#00000033] dark:border-[#FFFFFF33] p-3 rounded-2xl space-y-4'>
                            <span className='flex justify-between'>
                                <h2 className='font-medium dark:text-[#B3A5C6]'>Guest Users</h2>
                                <IconUserExclamation stroke={2} className='dark:text-[#B3A5C6]'/>
                            </span>
                            <p className='font-semibold text-3xl'>14273</p>
                        </div>
                    </>
                )}
            </section>

            {/* Chart Section */}
            <section>
                {loading ? (
                    <div className="flex justify-center items-center space-x-2 bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl" style={{ width: '100%', height: 450 }}>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                        <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                    </div>
                ) : (
                    <UserChart />
                )}
            </section>

        </main>
    );
};

export default HomePage;
