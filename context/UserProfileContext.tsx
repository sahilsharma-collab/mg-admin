"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";

import { api } from "@/lib/api";

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
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined
);

export const UserProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // The session lives in an httpOnly cookie the browser attaches on its own,
  // so there is no token for this provider to hold, pass down, or key effects
  // on. An unauthenticated call simply comes back 401.
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/profile");

      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      // 401 here is the ordinary signed-out case, not a failure worth showing:
      // the proxy has already cleared the dead cookie and middleware will send
      // the browser to /login on the next navigation.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setUser(null);
        return;
      }
      console.error("Failed to fetch profile:", err);
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  // Auth methods
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      // The credential exchange happens entirely on the server. This route
      // logs in, loads the profile, checks the ADMIN role and sets the session
      // cookie; the token is never part of a response body, so it never enters
      // this heap and no script on the origin can read it back.
      const response = await axios.post("/api/auth/login", { email, password });

      if (response.data.success) {
        setUser(response.data.user);
        toast.success("Logged in successfully");
        return true;
      }

      toast.error(response.data.message || "Login failed");
      return false;
    } catch (error) {
      console.error("Login error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Login failed");
      } else {
        toast.error("Login failed. Please try again.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Revokes server-side and clears the cookie in one response. The cookie
      // is cleared even if revocation fails, so a failed call can never leave
      // an operator looking signed in.
      const response = await axios.post("/api/auth/logout");
      if (!response.data.revoked) {
        toast.warn("Signed out locally; the server session may still be active.");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      toast.warn("Signed out locally; the server session may still be active.");
    }

    setUser(null);
    router.push("/login");
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setLoading(true);
      const response = await api.put("/api/profile", data);

      if (response.data.success) {
        setUser((prev) => ({ ...prev!, ...response.data.user }));
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile");
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
    <UserProfileContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        updateProfile,
        refreshProfile: fetchUserProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
};
