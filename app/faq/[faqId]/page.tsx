import React from 'react'
import FAQForm from '../form/faq-form';

type Props = {
    params: Promise<{ faqId: string }>
}

const Page = async ({ params }: Props) => {
    const { faqId } = await params;
    return (
        <div>
            <FAQForm faqId={faqId} />
        </div>
    )
}

export default Page
