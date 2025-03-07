import React from 'react'
import MarketAnalysisForm from '../form/market-analysis-form';

type Props = {
    params: Promise<{ maId: string }>
}

const Page = async ({ params }: Props) => {
    const { maId } = await params;
    return (
        <div>
            <MarketAnalysisForm maId={maId} />
        </div>
    )
}

export default Page
