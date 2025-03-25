"use client"
import Image from 'next/image';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

type FormValues = {
    email: string;
    password: string;
};

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const onSubmit = async (data: FormValues) => {
        try {
            setIsLoading(true);

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/login`,
                {
                    email: data.email,
                    password: data.password
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );

            if (response.data.success) {
                Cookies.set('auth_token', response.data.token, {
                    expires: 30,
                    path: '/'
                });

                toast.success(response.data.message || 'Logged in successfully');

                router.push('/');
            } else {
                toast.error(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);

            if (axios.isAxiosError(error) && error.response) {
                toast.error(error.response.data.message || 'Login failed. Please try again.');
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className='flex h-screen w-full'>
            <section className='hidden md:block lg:w-[65vw] h-full relative'>
                <Image
                    src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/f9eabd3d-74f1-4457-a112-5c9a29d448b5.jpg"}
                    alt='banner'
                    priority
                    fill
                    className="object-cover"
                />
            </section>

            <section className='bg-[#DBE7F7] flex flex-col px-6 md:px-12 py-12 w-full lg:w-[35vw] h-full'>
                <div className="flex items-center w-full justify-center mb-8">
                    <Image
                        src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/a7608b8c-5ac3-4235-b574-23a52d8c8b8d.png"}
                        height={60}
                        width={60}
                        alt="logo"
                    />
                    <Image
                        src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/fd9da0f9-c93c-44dc-9b61-4bc3a0a5ef17.png"}
                        height={100}
                        width={100}
                        alt="logo-text"
                        className="ml-2 mt-2"
                    />
                </div>
                <div className="mt-4">
                    <h2 className='font-medium text-2xl md:text-3xl'>
                        Welcome! 👋🏽
                    </h2>
                    <p className="mt-2">Please sign into your account</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" } })}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
                                placeholder="Enter your email"
                            />
                        </div>
                        {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } })}
                                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
                                placeholder="Enter your password"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <Eye className="h-5 w-5" />
                                    ) : (
                                        <EyeOff className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                        {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center">
                            <input
                                id="remember_me"
                                type="checkbox"
                                className="h-4 w-4 focus:ring-[#0ABAB5] focus:border-[#0ABAB5] border-gray-300 rounded"
                            />
                            <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-700">
                                Remember me
                            </label>
                        </div>
                        <div className="text-sm">
                            <a href="#" className="font-medium text-[#0ABAB5] hover:text-[#09a6a1]">
                                Forgot password?
                            </a>
                        </div>
                    </div>

                    <div className='w-full flex justify-center items-center'>
                        <button
                            type="submit"
                            className="w-fit px-14 py-2 mt-5 flex items-center justify-center border border-transparent rounded-2xl cursor-pointer shadow-sm text-sm font-medium text-white bg-[#0ABAB5] hover:bg-[#09a6a1] transition-colors duration-200"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                "Login"
                            )}
                        </button>

                    </div>
                </form>
            </section>
        </main>
    );
};

export default Login;