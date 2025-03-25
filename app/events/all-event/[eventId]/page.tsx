import React from 'react'
import EventForm from '../form/event-form';

type Props = {
    params: Promise<{ eventId: string }>
}

const Page = async ({ params }: Props) => {
    const { eventId } = await params;
    return (
        <div>
            <EventForm eventId={eventId} />
        </div>
    )
}

export default Page