import React from 'react'
import EventCategoryForm from '../form/event-category-form';

type Props = {
    params: Promise<{ eventCategoryId: string }>
}

const Page = async ({ params }: Props) => {
    const { eventCategoryId } = await params;
    return (
        <div>
            <EventCategoryForm categoryId={eventCategoryId} />
        </div>
    )
}

export default Page