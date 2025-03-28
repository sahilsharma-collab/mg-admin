"use client";

import React, { useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Zod schema for password validation
const passwordSchema = z.object({
    oldPassword: z.string()
        .min(6, { message: "Old password must be at least 6 characters" }),
    newPassword: z.string()
        .min(6, { message: "New password must be at least 6 characters" }),
    confirmPassword: z.string()
        .min(6, { message: "Confirm password must be at least 6 characters" })
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const Section2 = () => {
    const [showOldPassword, setShowOldPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Initialize the form with Zod resolver
    const form = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            oldPassword: "",
            newPassword: "",
            confirmPassword: ""
        }
    })

    // Form submission handler
    const onSubmit = (values: z.infer<typeof passwordSchema>) => {
        console.log(values)
        // Add your password change logic here
    }

    return (
        <section className='w-2/3 rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033] bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33]'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                    {/* Old Password Field */}
                    <FormField
                        control={form.control}
                        name="oldPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Old Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showOldPassword ? "text" : "password"}
                                            placeholder="Enter old password"
                                            disabled={form.formState.isSubmitting}
                                            {...field}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                        >
                                            {!showOldPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* New Password Field */}
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            disabled={form.formState.isSubmitting}
                                            {...field}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                        >
                                            {!showNewPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Confirm Password Field */}
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            disabled={form.formState.isSubmitting}
                                            {...field}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                        >
                                            {!showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-full bg-[#0ABAB5] hover:bg-[#09a6a1]"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? "Changing..." : "Change Password"}
                    </Button>
                </form>
            </Form>
        </section>
    )
}

export default Section2