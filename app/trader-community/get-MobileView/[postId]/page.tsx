import React from "react";
import PostPage from "@/components/ui/post-page";
type Props = {
  params: Promise<{ postId: string }>;
};

const Page = async ({ params }: Props) => {
  const { postId } = await params;
  return (
    <div>
      <PostPage postId={postId} />
    </div>
  );
};

export default Page;
