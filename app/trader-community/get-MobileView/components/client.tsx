"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MessageCircle,
  Eye,
  Plus,
  PlusCircle,
  ThumbsUp,
  Pin,
} from "lucide-react";
import Cookies from "js-cookie";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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
  const [hasAcceptedGuidelines, setHasAcceptedGuidelines] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const token = Cookies.get("auth_token");
  const router = useRouter();
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const handlePostClick = (postId: number) => {
    // Save the current scroll position with a timestamp to avoid stale data
    const scrollData = {
      position: window.scrollY,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(
      "communityScrollPosition",
      JSON.stringify(scrollData)
    );
    router.push(`/trader-community/get-MobileView/${postId}`);
  };

  // Improved scroll restoration useEffect - place this after your useState declarations
  useEffect(() => {
    // Only attempt to restore scroll position after posts have loaded
    if (!loading && posts.length > 0) {
      try {
        const savedPosition = sessionStorage.getItem("communityScrollPosition");
        // Only attempt to parse if we have saved data
        if (!savedPosition) return;

        const scrollData = JSON.parse(savedPosition);
        console.log("SCROLLLDATA", scrollData);
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

  // Handle search
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery || !token) {
        setSearchResults([]);
        return;
      }

      try {
        let api = "";
        if (activeTab === "myPosts") {
          api = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/my-post/search?query=${searchQuery}`;
        } else if (activeTab === "trendingPosts") {
          api = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/trending/search?query=${searchQuery}`;
        } else {
          api = `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/search?query=${searchQuery}`;
        }

        const response = await fetch(api, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setSearchResults(data.posts || []);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setSearchResults([]);
      }
    };

    handleSearch();
  }, [searchQuery, activeTab, token]);

  // Helper function to format date
  const formatTime = (dateString: string) => {
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
  };

  // Handle post deletion
  const handleDeletePost = async (postId: number) => {
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
      setPosts(posts.filter((post) => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setOpenDropdownId(null);
    }
  };

  const [suspendLoading, setSuspendLoading] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<number | null>(null);

  const suspendUser = async () => {
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

      const data = await response.json();
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
      setOpenDropdownId(null);
    }
  };

  // Handle reaction
  const handleAddReaction = async (postId: number, emoji: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}/reaction`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emoji }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add reaction");
      }

      // Update the post with the new reaction
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            myReaction: { emoji, id: Date.now() }, // Temporary ID
            _count: {
              ...post._count,
              reactions: post._count.reactions + 1,
            },
            reactions: [...post.reactions, { emoji, count: 1 }],
          };
        }
        return post;
      });

      setPosts(updatedPosts);
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
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
  };

  // Determine which posts to display
  const displayPosts = searchQuery ? searchResults : posts;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trader's Community</h1>

        {isSearchActive ? (
          <div className="flex gap-2 w-1/2">
            <Input
              placeholder={`Search in ${
                activeTab === "myPosts"
                  ? "My Posts"
                  : activeTab === "trendingPosts"
                  ? "Trending Posts"
                  : "Recent Posts"
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Button
              variant="outline"
              onClick={() => {
                setIsSearchActive(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsSearchActive(true)}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user?.imgUrl} alt={user?.userName} />
          <AvatarFallback>{user?.userName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="recentPosts">Recent</TabsTrigger>
            <TabsTrigger value="trendingPosts">Trending</TabsTrigger>
            <TabsTrigger value="myPosts">My Posts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 mb-20">
        {loading ? (
          // Loading skeletons
          Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden">
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
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">
              {searchQuery
                ? "No results found"
                : `No posts available in ${
                    activeTab === "myPosts"
                      ? "your posts"
                      : activeTab === "trendingPosts"
                      ? "trending posts"
                      : "recent posts"
                  }.`}
            </p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                {post.isPinned && (
                  <div className="flex items-center gap-2 mb-2 text-gray-500">
                    <Pin className="h-4 w-4" />
                    <span className="text-sm">Pinned</span>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage
                        src={post.author.imgUrl || undefined}
                        alt={post.author.userName}
                      />
                      <AvatarFallback>
                        {post.author.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">
                          {post.author.userName}
                        </span>
                        {post.author.role === "ADMIN" && (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-blue-100 text-blue-800"
                          >
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu
                    open={openDropdownId === post.id}
                    onOpenChange={(isOpen) =>
                      setOpenDropdownId(isOpen ? post.id : null)
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handlePostClick(post.id)}
                      >
                        View Details
                      </DropdownMenuItem>
                      {(user?.id === post.authorId ||
                        user?.role === "ADMIN") && (
                        <>
                          {user?.role === "ADMIN" &&
                            user?.id !== post.authorId && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setUserToSuspend(post.authorId);
                                    }}
                                    className="text-yellow-600"
                                  >
                                    Suspend User
                                  </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Confirm User Suspension
                                    </DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to suspend{" "}
                                      {post.author.userName}? This will restrict
                                      their account privileges.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setUserToSuspend(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={suspendUser}
                                      disabled={suspendLoading}
                                    >
                                      {suspendLoading ? (
                                        <>
                                          <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            ></circle>
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                          </svg>
                                          Processing...
                                        </>
                                      ) : (
                                        "Suspend User"
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}

                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600"
                              >
                                Delete Post
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this post?
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {}}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-lg font-medium mb-2">{post.title}</h3>

                {post.imageUrl && (
                  <div className="mb-4 rounded-md overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-auto max-h-[300px] object-cover"
                    />
                  </div>
                )}

                {post.content && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                    {post.content}
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 rounded-full"
                      //   onClick={() => handleAddReaction(post.id, "❤️")}
                    >
                      {post.myReaction ? (
                        post.myReaction.emoji
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      <span>{post._count.reactions}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 rounded-full"
                      //   onClick={() =>
                      //     router.push(`/dashboard/community/post/${post.id}`)
                      //   }
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{post._count.replies}</span>
                    </Button>

                    {user?.role === "ADMIN" && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Eye className="h-4 w-4" />
                        <span>{post._count.PostView}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create post button - fixed at bottom right */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => router.push("/dashboard/community/create-post")}
          className="rounded-full h-14 w-14 p-0 bg-[#0ABAB5] hover:bg-[#089b96]"
        >
          <Plus className="h-6 w-6" />
        </Button>
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
