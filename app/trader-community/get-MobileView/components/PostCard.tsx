import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Eye, MessageCircle, MoreHorizontal, Pin, ThumbsUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";

interface PostCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
    handlePostClick: (postId: number) => void;
    handleDeletePost: (postId: number) => void;
    suspendUser: () => void;
    suspendLoading: boolean;
    formatTime: (dateString: string) => string;
    setUserToSuspend: (userId: number | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReplyType = any;

const PostCard = ({
    post,
    user,
    handlePostClick,
    handleDeletePost,
    suspendUser,
    suspendLoading,
    formatTime,
    setUserToSuspend
}: PostCardProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (commentsOpen && comments.length === 0) {
            fetchComments();
        }
    }, [commentsOpen]);

    const fetchComments = async () => {
        setCommentsLoading(true);
        try {
            const response = await apiFetch(
                `/api/post/${post.id}`,
                {
                }
            );
            if (!response.ok) throw new Error('Failed to fetch comments');
            const data = await response.json();
            setComments(data.post?.replies || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }

        // Only add the event listener if the dropdown is open
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    return (
        <Card
            key={post.id}
            className="overflow-hidden hover:shadow-md transition-shadow bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] border border-[#00000033]"
        // onClick={() => handlePostClick(post.id)}
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
                                        className="ml-2 bg-white text-blue-800"
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

                    {/* Completely revised dropdown menu implementation */}
                    <div className="relative" ref={dropdownRef}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(!dropdownOpen);
                            }}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {dropdownOpen && (
                            <div
                                className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-black shadow-lg focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="py-1" role="none">
                                    <button
                                        className="w-full px-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePostClick(post.id);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <span className="text-gray-700 dark:text-gray-300 block w-full py-2 px-3 rounded-md text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                                            <Eye className="inline mr-2 w-4 h-4" />
                                            View Details
                                        </span>
                                    </button>

                                    {(user?.id === post.authorId || user?.role === "ADMIN") && (
                                        <>
                                            {user?.role === "ADMIN" && user?.id !== post.authorId && (
                                                <button
                                                    className="w-full px-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUserToSuspend(post.authorId);
                                                        setSuspendDialogOpen(true);
                                                        setDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-gray-700 dark:text-gray-300 block w-full py-2 px-3 rounded-md text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                                                        <AlertTriangle className="inline mr-2 w-4 h-4" />
                                                        Suspend User
                                                    </span>
                                                </button>
                                            )}

                                            <button
                                                className="w-full px-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteDialogOpen(true);
                                                    setDropdownOpen(false);
                                                }}
                                            >
                                                <span className="text-gray-700 dark:text-gray-300 block w-full py-2 px-3 rounded-md text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                                                    <Trash2 className="inline mr-2 w-4 h-4" />
                                                    Delete Post
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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

                <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-3">
                        {/* Reaction */}
                        <div className="flex items-center gap-1 rounded-full px-3 py-1 border text-sm bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                            {post.myReaction ? (
                                <span>{post.myReaction.emoji}</span>
                            ) : (
                                <ThumbsUp className="h-4 w-4" />
                            )}
                            <span>{post._count.reactions}</span>
                        </div>

                        {/* Comments */}
                        <div className="flex items-center gap-1 rounded-full px-3 py-1 border text-sm bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCommentsOpen(!commentsOpen);
                            }}>
                            <MessageCircle className="h-4 w-4" />
                            <span>{post._count.replies}</span>
                        </div>

                        {/* Views - visible only to admin */}
                        {user?.role === "ADMIN" && (
                            <div className="flex items-center gap-1 rounded-full px-3 py-1 border text-sm bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                <Eye className="h-4 w-4" />
                                <span>{post._count.PostView}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    {/* Comments dropdown */}
                    {commentsOpen && (
                        <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar" onClick={(e) => e.stopPropagation()}>
                            {commentsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-[100px]" />
                                                <Skeleton className="h-4 w-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No comments yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <Avatar>
                                                <AvatarImage src={comment.author.imgUrl || undefined} />
                                                <AvatarFallback>
                                                    {comment.author.userName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {comment.author.userName}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(comment.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm mt-1">{comment.content}</p>

                                                {/* Nested replies */}
                                                {comment.replies.length > 0 && (
                                                    <div className="mt-2 pl-4 border-l-2 border-gray-300 dark:border-gray-700">
                                                        {comment.replies.map((reply: ReplyType) => (
                                                            <div key={reply.id} className="mt-3 flex gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={reply.author.imgUrl || undefined} />
                                                                    <AvatarFallback>
                                                                        {reply.author.userName.charAt(0)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-sm">
                                                                            {reply.author.userName}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {formatTime(reply.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm mt-1">{reply.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>


            </CardContent>

            {/* Separate dialogs from dropdown */}
            {/* Delete Dialog */}
            {deleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(false);
                }}>
                    <div className="fixed inset-0 bg-black/50 bg-opacity-50"></div>
                    <div
                        className="bg-white dark:bg-black rounded-lg p-6 shadow-xl z-50 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
                        <p className="text-gray-500 mb-4">Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePost(post.id);
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend User Dialog */}
            {suspendDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => {
                    e.stopPropagation();
                    setSuspendDialogOpen(false);
                    setUserToSuspend(null);
                }}>
                    <div className="fixed inset-0 bg-black/50 bg-opacity-50"></div>
                    <div
                        className="bg-white dark:bg-black rounded-lg p-6 shadow-xl z-50 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-medium mb-2">Confirm User Suspension</h3>
                        <p className="text-gray-500 mb-4">
                            Are you sure you want to suspend {post.author.userName}? This will restrict their account privileges.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSuspendDialogOpen(false);
                                    setUserToSuspend(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    suspendUser();
                                    setSuspendDialogOpen(false);
                                }}
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
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

export default PostCard