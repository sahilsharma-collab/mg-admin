import React from 'react'
import PostForm from '../form/post-form';

type Props = {
    params: Promise<{ postId: string }>
}

const Page = async ({ params }: Props) => {
    const { postId } = await params;
    return (
        <div>
            <PostForm postId={postId} />
        </div>
    )
}

export default Page
