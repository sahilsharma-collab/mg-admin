"use client";

import axios from 'axios';
import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    emailVerified: boolean;
    countryCode: string;
    phone: string;
    city: string;
    exnessId: string;
    userName: string;
    imgUrl: string | null;
    role: string;
    exnessVerified: boolean;
    isUserBlocked: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UserProfileContextType {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const getAuthToken = () => Cookies.get('auth_token');
    const token = getAuthToken();

    const fetchUserProfile = async () => {
        if (!token) {
            setUser(null);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_PROD_URL}/api/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            setError('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    // Auth methods
    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setLoading(true);
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/login`,
                { email, password },
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.success) {
                Cookies.set('auth_token', response.data.token, { expires: 30, path: '/' });
                await fetchUserProfile();
                toast.success('Logged in successfully');
                return true;
            } else {
                toast.error(response.data.message || 'Login failed');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Login failed');
            } else {
                toast.error('Login failed. Please try again.');
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        Cookies.remove('auth_token');
        setUser(null);
        toast.success('Logged out successfully');
        router.push('/login');
    };

    // Handle Image Upload
    const handleImageUpload = async (file: File): Promise<string | null> => {
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            return response.data.fileUrl;
        } catch (error) {
            console.error("Failed to upload image:", error);
            toast.error("Failed to upload image.");
            return null;
        }
    };

    const updateProfile = async (data: Partial<UserProfile>) => {
        try {
            setLoading(true);
            const token = getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const response = await axios.put(
                `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile`,
                data,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setUser(prev => ({ ...prev!, ...response.data.user }));
                toast.success('Profile updated successfully');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update profile');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Initialize
    useEffect(() => {
        fetchUserProfile();
    }, []);

    return (
        <UserProfileContext.Provider value={{
            user,
            loading,
            error,
            login,
            logout,
            updateProfile,
            refreshProfile: fetchUserProfile
        }}>
            {children}
        </UserProfileContext.Provider>
    );
};

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};