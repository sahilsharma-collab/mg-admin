"use client";

import axios from "axios";
import Cookies from "js-cookie";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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

  const getAuthToken = () => Cookies.get("auth_token");
  const token = getAuthToken();

  const fetchUserProfile = async (token?: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
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
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/login`,
        { email, password, deviceId: "web-pc" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.success) {
        const token = response.data.token;

        // Fetch user profile to check role before completing login
        const profileResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Check if user has ADMIN role
        if (
          profileResponse.data.success &&
          profileResponse.data.user?.role !== "ADMIN"
        ) {
          toast.error("ADMIN role not found. Access denied.");
          return false;
        }

        // Was: { expires: 30, path: "/" } — a 30-day admin credential with no
        // Secure and no SameSite. Any script on the origin could read it, and
        // it would travel over plain HTTP if the panel were ever reached that
        // way. Shortened to match the access-token lifetime and marked
        // SameSite=Strict; Secure outside local development.
        //
        // This still is not httpOnly — js-cookie cannot set that flag. Moving
        // the token to a cookie written by a Next route handler is the real
        // fix and is tracked separately; this removes the cheap wins now.
        Cookies.set("auth_token", token, {
          expires: 1,
          path: "/",
          sameSite: "strict",
          secure: window.location.protocol === "https:",
        });
        setUser(profileResponse.data.user);
        toast.success("Logged in successfully");
        return true;
      } else {
        toast.error(response.data.message || "Login failed");
        return false;
      }
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
    // Logout used to delete the cookie and nothing else, so the session stayed
    // alive server-side for the full token lifetime — signing out on a shared
    // machine revoked nothing. Tell the API first, then clear locally.
    const token = getAuthToken();

    if (token) {
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        // Never strand the user in a signed-in UI because the call failed —
        // clear locally regardless, but make the partial logout visible.
        console.error("Server-side logout failed:", error);
        toast.warn("Signed out locally; the server session may still be active.");
      }
    }

    Cookies.remove("auth_token", { path: "/" });
    setUser(null);
    router.push("/login");
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
    fetchUserProfile(token);
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
