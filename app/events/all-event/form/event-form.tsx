"use client";
import React from "react";
import * as z from "zod";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import Image from "next/image";
import { EventCategoryResponseColumn } from "../../event-category/components/columns";
import { api } from "@/lib/api";
import type { CreateEventInput } from "@/contracts/api-types";

// Form Schema - currency pair NOT included in the form schema
const formSchema = z.object({
  categoryId: z.string().min(1, {
    message: "Category is required",
  }),
  date: z.date({
    required_error: "Date and time is required",
  }),
  notificationTime: z.string().min(1, {
    message: "Notification time is required",
  }),
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  eventId?: string;
}

const EventForm: React.FC<EventFormProps> = ({ eventId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [categories, setCategories] = useState<EventCategoryResponseColumn[]>(
    []
  );
  const [filteredCategories, setFilteredCategories] = useState<
    EventCategoryResponseColumn[]
  >([]);
  const [currencyPairs, setCurrencyPairs] = useState<string[]>([]);
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState<
    string | null
  >(null);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  const isEdit = !!eventId;
  const title = isEdit ? "Edit Event" : "Create Event";
  const toastMessage = isEdit ? "Event updated." : "Event created.";
  const action = isEdit ? "Update" : "Create";

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      date: undefined,
      notificationTime: "",
    },
  });

  // Fetch Categories for Dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setFetchingCategories(true);
        const response = await api.get(
          "/api/event/category",
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Categories data:", response.data);
        const categoriesData = response.data.eventCategory;
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);

        // Extract unique currency pairs
        const uniqueCurrencyPairs = [
          ...new Set(
            categoriesData
              .filter(
                (cat: {
                  currencyPair: {
                    currencyPair: string;
                  };
                }) => cat.currencyPair
              )
              .map(
                (cat: {
                  currencyPair: {
                    currencyPair: string;
                  };
                }) => cat.currencyPair
              )
          ),
        ] as string[];
        setCurrencyPairs(uniqueCurrencyPairs);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        toast.error("Failed to fetch categories.");
      } finally {
        setFetchingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Filter categories when currency pair changes
  useEffect(() => {
    if (!selectedCurrencyPair) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(
        (category) => category.currencyPair === selectedCurrencyPair
      );
      setFilteredCategories(filtered);

      // Reset category selection if current selection is not in filtered list
      const currentCategoryId = form.getValues("categoryId");
      if (currentCategoryId) {
        const categoryExists = filtered.some(
          (cat) => cat.id.toString() === currentCategoryId
        );

        if (!categoryExists) {
          form.setValue("categoryId", "");
        }
      }
    }
  }, [selectedCurrencyPair, categories, form]);

  // Fetch Event Data for Editing
  useEffect(() => {
    if (isEdit && eventId) {
      const fetchEvent = async () => {
        try {
          setFetching(true);
          const response = await api.get(
            `/api/event/${eventId}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const eventData = response.data.event;

          // Get the category to find its currency pair
          const category = categories.find(
            (cat) => cat.id.toString() === eventData.categoryId.toString()
          );

          // Set the currency pair filter (separate from form)
          if (category?.currencyPair) {
            setSelectedCurrencyPair(category.currencyPair);
          }

          form.reset({
            categoryId: eventData.categoryId.toString(),
            date: new Date(eventData.date),
            notificationTime: eventData.notificationTime.toString(),
          });
        } catch (error) {
          console.error("Failed to fetch event data:", error);
          toast.error("Failed to fetch event data.");
        } finally {
          setFetching(false);
        }
      };
      fetchEvent();
    }
  }, [eventId, isEdit, form, categories]);

  // Handle Form Submission
  const onSubmit = async (data: EventFormValues) => {
    try {
      setLoading(true);

      // P3-8: pinned to the API's request contract, generated from its Zod
      // schemas. A drift in either direction is a compile error here rather
      // than a 400 in production. See contracts/README.md.
      const payload: CreateEventInput = {
        categoryId: parseInt(data.categoryId),
        date: data.date.toISOString(),
        notificationTime: parseInt(data.notificationTime),
      };

      if (isEdit && eventId) {
        // Update Event
        await api.put(
          `/api/event/${eventId}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        // Create Event
        await api.post(
          "/api/event",
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      router.push("/events/all-event");
      router.refresh();
      toast.success(toastMessage);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log("Axios Error:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Something went wrong.");
      } else if (error instanceof Error) {
        console.log("Error:", error.message);
        toast.error(error.message || "Something went wrong.");
      } else {
        console.log("Unknown Error:", error);
        toast.error("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle currency pair filter change
  const handleCurrencyPairChange = (value: string) => {
    setSelectedCurrencyPair(value);
  };

  // Clear currency pair filter
  const clearCurrencyPairFilter = () => {
    setSelectedCurrencyPair(null);
  };

  return (
    <section className="container-padding">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl my-3">{title}</h1>
      </div>

      {/* Currency Pair Filter (Outside the form) */}
      <div className="mb-8">
        <div className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Filter by Currency Pair
              </label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <Select
                    onValueChange={handleCurrencyPairChange}
                    value={selectedCurrencyPair || undefined}
                    disabled={loading || fetchingCategories}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a currency pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCurrencyPair && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCurrencyPairFilter}
                    className="px-3"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {selectedCurrencyPair && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing categories for {selectedCurrencyPair} (
                  {filteredCategories.length} categories)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actual Form - without currency pair */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-[#DBE7F7] dark:bg-[#4A87D833] dark:border-[#FFFFFF33] space-y-8 w-full rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033]"
        >
          {fetching ? (
            <div className="flex justify-center items-center h-24">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                  style={{ animationDelay: "200ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
                  style={{ animationDelay: "400ms" }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:gap-8">
              {/* Category Dropdown */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading || fetchingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              {category.imgUrl && (
                                <div className="relative h-6 w-6 rounded-md">
                                  <Image
                                    src={category.imgUrl}
                                    alt={category.name}
                                    width={24}
                                    height={24}
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <span>{category.name}</span>
                              {category.currencyPair && (
                                <span className="text-xs text-gray-500">
                                  ({category.currencyPair})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date and Time</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notification Time Field */}
              <FormField
                control={form.control}
                name="notificationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Time (minutes before)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        disabled={loading}
                        placeholder="Enter minutes before event"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <Button
            disabled={loading || fetching}
            className="ml-auto bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 rounded-full"
            type="submit"
          >
            {action}
          </Button>
        </form>
      </Form>
    </section>
  );
};

export default EventForm;
