import React from 'react'
import PostPage from './PostPage';

type Props = {
  params: Promise<{ postId: string }>
}

const page = async ({ params }: Props) => {
  const { postId } = await params;

  return (
    <div className='container-padding'>
      <PostPage postId={postId} />
    </div>
  )
}

export default page;
