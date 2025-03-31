"use client";
import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUserProfile } from '@/context/UserProfileContext';
import { toast } from 'react-toastify';

// Updated Zod validation schema with optional image validation
const profileSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    countryCode: z.string().min(1, { message: "Country code is required" }),
    phone: z.string()
        .min(7, { message: "Phone number must be at least 7 digits" })
        .max(15, { message: "Phone number is too long" })
        .regex(/^\d+$/, { message: "Phone number must contain only digits" }),
    city: z.string().min(2, { message: "City must be at least 2 characters" }),
    profileImage: z.union([
        z.instanceof(File)
            .refine(file => ['image/jpeg', 'image/png', 'image/gif'].includes(file.type), {
                message: "Only JPEG, PNG, and GIF images are allowed"
            })
            .refine(file => file.size <= 5 * 1024 * 1024, {
                message: "Image size must be less than 5MB"
            }),
        z.undefined()
    ]).optional()
});

// Type inference for the schema
type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { user, updateProfile, loading: formLoading } = useUserProfile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const getAuthToken = () => Cookies.get('auth_token');
    const token = getAuthToken();
    const [imageUploading, setImageUploading] = useState(false);

    // Initialize the form with react-hook-form and zod resolver
    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || '',
            countryCode: user?.countryCode || '+1',
            phone: user?.phone || '',
            city: user?.city || '',
            profileImage: undefined // No default value for file input
        }
    });

    // Handle Image Upload
    const handleImageUpload = async (file: File | undefined) => {
        if (!file) return null;

        setImageUploading(true);
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
        } finally {
            setImageUploading(false);
        }
    };

    // Handle image selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                form.setValue('profileImage', file, { shouldValidate: true });
            } catch (error) {
                console.error("Error setting image value:", error);
            }
        } else {
            form.setValue('profileImage', undefined, { shouldValidate: true });
        }
    };

    // Trigger file input
    const triggerFileInput = () => {
        if (!imageUploading) {
            fileInputRef.current?.click();
        }
    };

    // Get the current image preview
    const getImagePreview = () => {
        const formImage = form.watch('profileImage');
        if (formImage instanceof File) {
            return URL.createObjectURL(formImage);
        }
        return user?.imgUrl || "/Images/avatar.png";
    };

    // Form submission handler
    const onSubmit = async (data: ProfileFormData) => {
        try {
            // Upload the image if provided
            let imageUrl = user?.imgUrl || ""; // Default to existing image URL

            if (data.profileImage) {
                const uploadedUrl = await handleImageUpload(data.profileImage);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                } else {
                    // If image upload fails but was optional, continue with existing URL
                    if (!data.profileImage) {
                        imageUrl = user?.imgUrl || "";
                    } else {
                        toast.error("Image upload failed");
                        return;
                    }
                }
            }

            // Update profile with all data
            await updateProfile({
                name: data.name,
                countryCode: data.countryCode,
                phone: data.phone,
                city: data.city,
                imgUrl: imageUrl
            });

            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
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
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-full max-w-lg mx-auto"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                                <h3 className="text-lg font-semibold">Edit Profile</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                disabled={formLoading || imageUploading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Profile Image Upload as a FormField */}
                                <FormField
                                    control={form.control}
                                    name="profileImage"
                                    render={({ }) => (
                                        <FormItem className="flex flex-col items-center">
                                            <FormLabel>Profile Image</FormLabel>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                                accept="image/jpeg,image/png,image/gif"
                                                className="hidden"
                                                disabled={formLoading || imageUploading}
                                            />
                                            <div
                                                className="w-36 h-36 rounded-full border-4 border-[#0ABAB5] relative group cursor-pointer mb-2"
                                                onClick={triggerFileInput}
                                            >
                                                <img
                                                    src={getImagePreview()}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {imageUploading ? (
                                                        <Loader2 className="text-white w-8 h-8 animate-spin" />
                                                    ) : (
                                                        <Camera className="text-white w-8 h-8" />
                                                    )}
                                                </div>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your name"
                                                    {...field}
                                                    disabled={formLoading || imageUploading}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-3 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="countryCode"
                                        render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel>Country Code</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    disabled={formLoading || imageUploading}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select country code" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="+1">+1 (US)</SelectItem>
                                                        <SelectItem value="+44">+44 (UK)</SelectItem>
                                                        <SelectItem value="+91">+91 (India)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="tel"
                                                        placeholder="Enter phone number"
                                                        {...field}
                                                        disabled={formLoading || imageUploading}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your city"
                                                    {...field}
                                                    disabled={formLoading || imageUploading}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end space-x-3 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={formLoading || imageUploading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={formLoading || imageUploading}
                                        className='bg-[#0ABAB5] hover:bg-[#09a6a1]'
                                    >
                                        {formLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;