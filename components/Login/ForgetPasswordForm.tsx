import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useRouter } from 'next/navigation';

type FormValues = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

const ResetPasswordForm = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const sendOTP = async (data: { email: string }) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/forgot-password`, {
        email: data.email
      });

      toast.success(response.data.message || "OTP sent successfully");
      setOtpSent(true);
    } catch (error) {
      toast.error("Failed to send OTP");
      console.log("Failed to send OTP", error)
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: FormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/reset-password`, {
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword
      });

      toast.success("Password reset successfully");
      router.push('/login');
    } catch (error) {
      toast.error("Password reset failed");
      console.log("Password failed", error)
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!otpSent) {
      await sendOTP(data);
    } else {
      await resetPassword(data);
    }
  };

  return (
    <section>
      <div className="mt-4">
        <h2 className='font-medium text-2xl md:text-3xl'>
          Reset Password
        </h2>
        <p className="mt-2">
          {!otpSent
            ? "Enter your email to receive OTP"
            : `OTP sent to ${watch('email')}`}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
              })}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
              placeholder="Enter your email"
              disabled={otpSent}
            />
          </div>
          {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        {/* OTP Input (shown after email is sent) */}
        {otpSent && (
          <>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">OTP</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="otp"
                  type="text"
                  {...register("otp", {
                    required: "OTP is required",
                    pattern: { value: /^\d{6}$/, message: "OTP must be 6 digits" }
                  })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
              </div>
              {errors.otp && <p className="mt-2 text-sm text-red-600">{errors.otp.message}</p>}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  {...register("newPassword", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: "Password must contain at least one uppercase, one lowercase, one number and one special character"
                    }
                  })}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
                  placeholder="Enter new password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                  {!showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </div>
              </div>
              {errors.newPassword && <p className="mt-2 text-sm text-red-600">{errors.newPassword.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) => value === watch('newPassword') || "Passwords do not match"
                  })}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ABAB5] focus:border-[#0ABAB5] sm:text-sm bg-white"
                  placeholder="Confirm new password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {!showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </div>
              </div>
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>}
            </div>
          </>
        )}

        <div className='w-full flex flex-col items-center space-y-4'>
          {/* Main Submit Button */}
          <button
            type="submit"
            className="w-fit px-14 py-2 flex items-center justify-center border border-transparent rounded-2xl cursor-pointer shadow-sm text-sm font-medium text-white bg-[#0ABAB5] hover:bg-[#09a6a1] transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              otpSent ? "Reset Password" : "Send OTP"
            )}
          </button>

          {/* {otpSent && (
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="text-sm text-[#0ABAB5] hover:underline"
              disabled={isLoading}
            >
              Change Email
            </button>
          )} */}
        </div>
      </form>
    </section>
  )
}

export default ResetPasswordForm;