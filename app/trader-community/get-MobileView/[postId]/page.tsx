"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";

interface Reaction {
  id: number;
  emoji: string;
  userId: number;
  postId: number;
  replyId: number | null;
  createdAt: string;
}

interface Reply {
  id: number;
  content: string;
  imageUrl: string | null;
  authorId: number;
  postId: number;
  parentId: number | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    userName: string;
    imgUrl: string | null;
    role: string;
  };
  reactions: Reaction[];
  replies: Reply[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  authorId: number;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: Reaction[];
  author: {
    id: number;
    userName: string;
    imgUrl: string | null;
    role: string;
  };
  replies: Reply[];
}

const postUpdateSchema = z.object({
  isBlocked: z.boolean(),
  blockReason: z.string().optional(),
});

type PostUpdateFormData = z.infer<typeof postUpdateSchema>;

const countTotalReplies = (replies: Reply[]): number => {
  return replies.reduce((total, reply) => {
    return total + 1 + countTotalReplies(reply.replies);
  }, 0);
};

export default function PostPage({ params }: { params: { postId: string } }) {
  const { postId } = params;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const token = Cookies.get("auth_token");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PostUpdateFormData>({
    resolver: zodResolver(postUpdateSchema),
    defaultValues: {
      isBlocked: false,
      blockReason: "",
    },
  });

  const isBlocked = watch("isBlocked");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();
        setPost(data.post);
        setValue("isBlocked", data.post.isBlocked);
        setValue("blockReason", "");
      } catch (error) {
        console.error("Error fetching post:", error);
        toast.error("Failed to load post details");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, token, setValue]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy h:mm a");
  };

  const [userToSuspend, setUserToSuspend] = useState<number | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

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

      toast.success("User has been suspended successfully");

      // Remove all replies from the suspended user
      setPost((prevPost) => {
        if (!prevPost) return null;

        const removeUserReplies = (replies: Reply[]): Reply[] => {
          return replies
            .filter((reply) => reply.authorId !== userToSuspend)
            .map((reply) => ({
              ...reply,
              replies: removeUserReplies(reply.replies),
            }));
        };

        return {
          ...prevPost,
          replies: removeUserReplies(prevPost.replies),
        };
      });
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user. Please try again.");
    } finally {
      setSuspendLoading(false);
      setUserToSuspend(null);
    }
  };

  const onSubmit = async (data: PostUpdateFormData) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/${postId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const result = await response.json();
      toast.success(result.message);
      setPost((prev) => (prev ? { ...prev, isBlocked: data.isBlocked } : null));
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post status");
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PROD_URL}/api/post/reply/${replyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const result = await response.json();
      toast.success(result.message);

      // Remove the deleted reply from state
      setPost((prevPost) => {
        if (!prevPost) return null;

        const removeReply = (replies: Reply[]): Reply[] => {
          return replies
            .filter((reply) => reply.id !== replyId)
            .map((reply) => ({
              ...reply,
              replies: removeReply(reply.replies),
            }));
        };

        return {
          ...prevPost,
          replies: removeReply(prevPost.replies),
        };
      });
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("Failed to delete reply");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex space-x-2">
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "200ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
            style={{ animationDelay: "400ms" }}
          ></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-medium">Post not found</h2>
      </div>
    );
  }

  const totalReplies = countTotalReplies(post.replies);
  const totalReactions = post.reactions.length;

  const renderReplies = (replies: Reply[], depth = 0) => {
    return replies.map((reply) => (
      <React.Fragment key={reply.id}>
        <TableRow className={depth > 0 ? "bg-muted/50" : ""}>
          <TableCell className="py-4">
            <div className="flex items-center space-x-3">
              {reply.author.imgUrl ? (
                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                  <Image
                    src={reply.author.imgUrl}
                    alt={reply.author.userName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Image
                    src="/icons/user.png"
                    alt="User"
                    width={24}
                    height={24}
                    className="opacity-50"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{reply.author.userName}</span>
                  {reply.author.role === "ADMIN" && (
                    <Image
                      src="/icons/verifiedTick.png"
                      alt="Verified"
                      width={16}
                      height={16}
                    />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(reply.createdAt)}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell className="py-4">
            <div className="space-y-2">
              <p className="whitespace-pre-line">{reply.content}</p>
              {reply.imageUrl && (
                <div className="relative w-full h-48 rounded-md overflow-hidden mt-2">
                  <Image
                    src={reply.imageUrl}
                    alt="Reply image"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="py-4 text-right">
            <div className="flex justify-end space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDeleteReply(reply.id)}
                    className="text-destructive"
                  >
                    Delete Reply
                  </DropdownMenuItem>
                  {reply.author.role !== "ADMIN" && (
                    <DropdownMenuItem
                      onClick={() => setUserToSuspend(reply.authorId)}
                      className="text-yellow-600"
                    >
                      Suspend User
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
        {reply.replies.length > 0 && renderReplies(reply.replies, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
          <p className="text-muted-foreground">
            Posted by {post.author.userName} on {formatDateTime(post.createdAt)}
          </p>
        </div>
        <Badge variant={post.isBlocked ? "destructive" : "default"}>
          {post.isBlocked ? "BLOCKED" : "ACTIVE"}
        </Badge>
      </div>

      <div className="flex space-x-4 border-b">
        <Button
          variant="ghost"
          className={`px-0 ${
            activeTab === "details" ? "border-b-2 border-primary" : ""
          }`}
          onClick={() => setActiveTab("details")}
        >
          Post Details
        </Button>
        <Button
          variant="ghost"
          className={`px-0 ${
            activeTab === "replies" ? "border-b-2 border-primary" : ""
          }`}
          onClick={() => setActiveTab("replies")}
        >
          Replies ({totalReplies})
        </Button>
        <Button
          variant="ghost"
          className={`px-0 ${
            activeTab === "actions" ? "border-b-2 border-primary" : ""
          }`}
          onClick={() => setActiveTab("actions")}
        >
          Actions
        </Button>
      </div>

      {activeTab === "details" && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {post.author.imgUrl ? (
                    <div className="relative h-10 w-10 rounded-full overflow-hidden">
                      <Image
                        src={post.author.imgUrl}
                        alt={post.author.userName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Image
                        src="/icons/user.png"
                        alt="User"
                        width={24}
                        height={24}
                        className="opacity-50"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {post.author.userName}
                      </span>
                      {post.author.role === "ADMIN" && (
                        <Image
                          src="/icons/verifiedTick.png"
                          alt="Verified"
                          width={16}
                          height={16}
                        />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(post.createdAt)}
                    </span>
                  </div>
                </div>

                {post.content && (
                  <p className="whitespace-pre-line text-sm">{post.content}</p>
                )}

                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <span className="mr-1">💖</span>
                    {totalReactions} reactions
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">💬</span>
                    {totalReplies} comments
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {post.imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Post Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[30rem] rounded-md overflow-hidden">
                  <Image
                    src={post.imageUrl}
                    alt="Post image"
                    fill
                    className="object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "replies" && (
        <Card>
          <CardHeader>
            <CardTitle>Replies</CardTitle>
          </CardHeader>
          <CardContent>
            {post.replies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Content</TableHead>

                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderReplies(post.replies)}</TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No replies yet
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "actions" && (
        <Card>
          <CardHeader>
            <CardTitle>Post Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center justify-between space-x-4">
                <div>
                  <Label htmlFor="isBlocked">Block Post</Label>
                  <p className="text-sm text-muted-foreground">
                    Blocking will hide this post from public view
                  </p>
                </div>
                <Switch
                  id="isBlocked"
                  checked={isBlocked}
                  onCheckedChange={(checked) => setValue("isBlocked", checked)}
                />
              </div>

              {isBlocked && (
                <div className="space-y-2">
                  <Label htmlFor="blockReason">Block Reason</Label>
                  <Textarea
                    id="blockReason"
                    placeholder="Enter reason for blocking this post..."
                    {...register("blockReason")}
                  />
                  {errors.blockReason && (
                    <p className="text-sm text-destructive">
                      {errors.blockReason.message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Suspend User Confirmation Dialog */}
      <Dialog
        open={!!userToSuspend}
        onOpenChange={(open) => !open && setUserToSuspend(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Suspension</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this user? This will remove all
              their replies.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToSuspend(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={suspendUser}
              disabled={suspendLoading}
            >
              {suspendLoading ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
