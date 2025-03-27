import React from 'react'
import IssuePage from './IssuePage'

type Props = {
    params: Promise<{ issueId: string }>
}

const Page = async ({ params }: Props) => {
    const { issueId } = await params;
    return (
        <div>
            <IssuePage issueId={issueId} />
        </div>
    )
}

export default Page
