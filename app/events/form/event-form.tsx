"use client"

import * as z from "zod"
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-toastify"
import Cookies from 'js-cookie';
import Image from "next/image"
import { DateTimePicker } from "@/components/ui/datetime-picker";

const forexCountryFlags = {
    "USA": "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
    "European Union": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg",
    "United Kingdom": "https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg",
    "Japan": "https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg",
    "Switzerland": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg",
    "Canada": "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg",
    "Australia": "https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_Australia_%28converted%29.svg",
    "New Zealand": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg",
    "China": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg",
    "Singapore": "https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Singapore.svg",
    "Hong Kong": "https://upload.wikimedia.org/wikipedia/commons/5/5b/Flag_of_Hong_Kong.svg",
    "Mexico": "https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg",
    "South Africa": "https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg",
    "Russia": "https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg",
    "India": "https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg",
    "Brazil": "https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg",
    "Sweden": "https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg",
    "Norway": "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg",
    "Turkey": "https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg",
    "South Korea": "https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg"
};

const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required"
    }),
    description: z.string().min(1, {
        message: "Description is required"
    }),
    date: z.string().min(1, {
        message: "Date is required"
    }),
    currencyPair: z.string().min(1, {
        message: "Currency pair is required"
    }),
    imgUrl: z.string().min(1, {
        message: "Country flag is required"
    }),
});

type EventFormValues = z.infer<typeof formSchema>

interface EventFormProps {
    eventId?: string;
}

const EventForm: React.FC<EventFormProps> = ({ eventId }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const isEdit = !!eventId;
    const title = isEdit ? 'Edit an Event' : 'Create an Event';
    const toastMessage = isEdit ? 'Event updated.' : 'Event created.';
    const action = isEdit ? 'Update' : 'Create';
    const token = Cookies.get('auth_token');

    const form = useForm<EventFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: "",
            date: "",
            currencyPair: "",
            imgUrl: "",
        }
    });

    useEffect(() => {
        if (isEdit) {
            const fetchEvent = async () => {
                try {
                    setFetching(true);
                    const response = await axios.get(`${process.env.NEXT_PUBLIC_PROD_URL}/api/event/${eventId}`, {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                        }
                    });

                    const eventData = response.data.event;
                    form.reset({
                        title: eventData.title,
                        description: eventData.description,
                        date: new Date(eventData.date).toISOString(),
                        currencyPair: eventData.currencyPair,
                        imgUrl: eventData.imgUrl,
                    });
                } catch (error) {
                    console.error("Failed to fetch event data:", error);
                    toast.error('Failed to fetch event data.');
                } finally {
                    setFetching(false);
                }
            };
            fetchEvent();
        }
    }, [eventId, isEdit, form]);

    const onSubmit = async (data: EventFormValues) => {
        try {
            setLoading(true);

            if (isEdit) {
                // Use PUT request for updating the event
                await axios.put(`${process.env.NEXT_PUBLIC_PROD_URL}/api/event/${eventId}`, {
                    title: data.title,
                    description: data.description,
                    currencyPair: data.currencyPair,
                    date: data.date,
                    imgUrl: data.imgUrl,
                }, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                });
            } else {
                // Use POST request for creating a new event
                await axios.post(`${process.env.NEXT_PUBLIC_PROD_URL}/api/event`, data, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                });
            }

            router.push(`/events`);
            router.refresh();
            toast.success(toastMessage);

        } catch (error: unknown) {
            if (error instanceof AxiosError) { // Check if the error is an AxiosError
                console.log("Axios Error:", error.response?.data || error.message);
                toast.error(error.response?.data?.message || 'Something went wrong.');
            } else if (error instanceof Error) { // Fallback for generic errors
                console.log("Error:", error.message);
                toast.error(error.message || 'Something went wrong.');
            } else {
                console.log("Unknown Error:", error);
                toast.error('Something went wrong.');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredCountries = Object.entries(forexCountryFlags).filter(([country]) =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <section className="container-padding">
            <div className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl my-3">{title}</h1>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="bg-[#DBE7F7] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
                    {fetching ? (
                        <div className="flex justify-center items-center h-24">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                                <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:gap-8">
                            {/* Form Fields */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="Event title" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea disabled={loading} placeholder="Event description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date and Time</FormLabel>
                                            <FormControl>
                                                <DateTimePicker
                                                    value={field.value ? new Date(field.value) : undefined}
                                                    onChange={(date) => field.onChange(date?.toISOString())}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currencyPair"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency Pair</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} placeholder="Currency pair" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="imgUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country Flag</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a country flag" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {/* Search Input */}
                                                        <Input
                                                            placeholder="Search country"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.currentTarget.focus();
                                                            }}
                                                            onFocus={(e) => {
                                                                e.stopPropagation();
                                                            }}
                                                            onKeyDown={(e) => {
                                                                e.stopPropagation();
                                                            }}
                                                            autoFocus
                                                            className="mb-2 bg-white"
                                                        />

                                                        {/* Filtered Countries List */}
                                                        {filteredCountries.map(([country, flagUrl]) => (
                                                            <SelectItem key={country} value={flagUrl}>
                                                                <div className="flex items-center">
                                                                    <Image width={40} height={40} src={flagUrl} alt={country} className="w-6 h-4 mr-2" />
                                                                    <span>{country}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </div>
                    )}
                    <Button disabled={loading || fetching} className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full" type="submit">
                        {action}
                    </Button>
                </form>
            </Form>
        </section>
    );
};

export default EventForm;