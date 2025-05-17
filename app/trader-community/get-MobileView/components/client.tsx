"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  X,
} from "lucide-react";
import Cookies from "js-cookie";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PostCard from "./PostCard";

// Types
interface Reaction {
  emoji: string;
  count: number;
}

interface MyReaction {
  emoji: string;
  id: number;
}

interface PostAuthor {
  userName: string;
  imgUrl: string | null;
  role: string;
}

interface Post {
  id: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  isPinned: boolean;
  author: PostAuthor;
  _count: {
    reactions: number;
    replies: number;
    PostView: number;
  };
  reactions: Reaction[];
  myReaction: MyReaction | null;
}

const CommunityDashboard = () => {
  const [activeTab, setActiveTab] = useState("recentPosts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<number | null>(null);
  const token = Cookies.get("auth_token");
  const router = useRouter();

  const handlePostClick = useCallback((postId: number) => {
    const scrollData = {
      position: window.scrollY,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(
      "communityScrollPosition",
      JSON.stringify(scrollData)
    );
    router.push(`/trader-community/get-MobileView/${postId}`);
  }, [router]);

  useEffect(() => {
    // Only attempt to restore scroll position after posts have loaded
    if (!loading && posts.length > 0) {
      try {
        const savedPosition = sessionStorage.getItem("communityScrollPosition");
        // Only attempt to parse if we have saved data
        if (!savedPosition) return;

        const scrollData = JSON.parse(savedPosition);

        // Check if the scroll data exists and is less than 5 minutes old
        if (scrollData && Date.now() - scrollData.timestamp < 5 * 60 * 1000) {
          // Use a small timeout to ensure the DOM has fully rendered
          setTimeout(() => {
            window.scrollTo({
              top: scrollData.position,
              behavior: "auto", // Use "auto" instead of "smooth" for more reliable positioning
            });
            // Only clear after successfully scrolling
            sessionStorage.removeItem("communityScrollPosition");
          }, 100);
        } else {
          // Clear stale scroll data
          sessionStorage.removeItem("communityScrollPosition");
        }
      } catch (error) {
        console.error("Error restoring scroll position:", error);
        sessionStorage.removeItem("communityScrollPosition");
      }
    }
  }, [loading, posts]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!token) {
          toast.error("You are not logged in");
          return;
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_PROD_URL;
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          console.error("Invalid response format:", data);
          toast.error("Couldn't retrieve user data");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      }
    };

    fetchUserProfile();
  }, [token]);

  // Fetch posts based on active tab
  useEffect(() => {
    const fetchPosts = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        let endpoint = "";

        if (activeTab === "myPosts") {
          endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/my-posts`;
        } else if (activeTab === "trendingPosts") {
          endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/trending`;
        } else {
          endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post`;
        }

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.statusText}`);
        }

        const data = await response.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [activeTab, token]);

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => {
    const searchLowerCase = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(searchLowerCase) ||
      (post.content && post.content.toLowerCase().includes(searchLowerCase)) ||
      post.author.userName.toLowerCase().includes(searchLowerCase)
    );
  });

  // Helper function to format date - memoized
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      let endpoint = "";

      if (activeTab === "myPosts") {
        endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/my-post`;
      } else if (activeTab === "trendingPosts") {
        endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/trending`;
      } else {
        endpoint = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post`;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh posts: ${response.statusText}`);
      }

      const data = await response.json();
      setPosts(data.posts || []);
      toast.success("Posts refreshed");
    } catch (err) {
      console.error("Error refreshing posts:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh posts");
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, token]);

  // Handle post deletion
  const handleDeletePost = useCallback(async (postId: number) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      // Refresh posts after deletion
      setPosts(posts => posts.filter((post) => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  }, [token]);

  const suspendUser = useCallback(async () => {
    if (!token || !userToSuspend) {
      toast.error("User ID is required to suspend a user");
      return;
    }

    setSuspendLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/profile/block/${userToSuspend}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to suspend user");
      }

      toast.success("User has been suspended successfully");

      // Remove all posts from the suspended author
      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.authorId !== userToSuspend)
      );
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user. Please try again.");
    } finally {
      setSuspendLoading(false);
      setUserToSuspend(null);
    }
  }, [token, userToSuspend]);

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Trader&apos;s Community</h1>

        {/* Always visible search input */}
        <div className="relative w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by title, content, or author"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 w-full"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-full bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] border border-[#00000033]">
            <TabsTrigger value="recentPosts">Recent</TabsTrigger>
            <TabsTrigger value="trendingPosts">Trending</TabsTrigger>
            <TabsTrigger value="myPosts">My Posts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 mb-20 ">
        {loading ? (
          // Loading skeletons
          Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] border border-[#00000033]">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[70px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-6" />
                  <Skeleton className="h-[200px] w-full rounded-md mb-4" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">
              {searchQuery
                ? "No results found for your search"
                : `No posts available in ${activeTab === "myPosts"
                  ? "your posts"
                  : activeTab === "trendingPosts"
                    ? "trending posts"
                    : "recent posts"
                }.`}
            </p>
          </div>
        ) : (

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filteredPosts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              handlePostClick={handlePostClick}
              handleDeletePost={handleDeletePost}
              suspendUser={suspendUser}
              suspendLoading={suspendLoading}
              formatTime={formatTime}
              token={token}
              setUserToSuspend={setUserToSuspend}
            />
          ))

        )}
      </div>

      {/* Refresh button - fixed at bottom left */}
      <div className="fixed bottom-6 left-6">
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="rounded-full h-12 w-12 p-0"
          disabled={refreshing}
        >
          <svg
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default CommunityDashboard;