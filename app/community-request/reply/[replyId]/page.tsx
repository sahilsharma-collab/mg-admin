import React from 'react'
import ReplyReportPage from './ReplyPage';

type Props = {
    params: Promise<{ replyId: string }>
}

const Page = async ({ params }: Props) => {
    const { replyId } = await params;
    return (
        <div>
            <ReplyReportPage replyId={replyId} />
        </div>
    )
}

export default Page
