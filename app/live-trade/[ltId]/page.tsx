import React from 'react'
import LiveTradeForm from '../form/live-trade-form';

type Props = {
    params: Promise<{ ltId: string }>
}

const Page = async ({ params }: Props) => {
    const { ltId } = await params;
    return (
        <div>
            <LiveTradeForm ltId={ltId} />
        </div>
    )
}

export default Page
