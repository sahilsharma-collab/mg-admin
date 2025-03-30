"use client";

import * as React from "react";
import { CiCalendar } from "react-icons/ci";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    const [date, setDate] = React.useState<Date | undefined>(value);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        setDate(value); // Sync state with form
    }, [value]);

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            setDate(selectedDate);
            onChange(selectedDate);
        }
    };

    const handleTimeChange = (
        type: "hour" | "minute" | "ampm",
        value: string
    ) => {
        if (date) {
            const newDate = new Date(date);
            if (type === "hour") {
                newDate.setHours(
                    (parseInt(value) % 12) + (newDate.getHours() >= 12 ? 12 : 0)
                );
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            } else if (type === "ampm") {
                const currentHours = newDate.getHours();
                newDate.setHours(
                    value === "PM" ? currentHours + 12 : currentHours - 12
                );
            }
            setDate(newDate);
            onChange(newDate);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] focus:ring-[0.1px] focus:ring-[#0ABAB5] focus:border-[#0ABAB5]",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CiCalendar className="mr-2 h-4 w-4 " />
                    {date ? format(date, "MM/dd/yyyy hh:mm aa") : <span>MM/DD/YYYY hh:mm aa</span>}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0 dark:bg-[#2E2941] dark:border-[#FFFFFF33]">
                <div className="sm:flex">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="dark:bg-[#2E2941]"
                        classNames={{
                            day_selected: "dark:bg-[#0ABAB5] dark:text-white dark:hover:bg-[#0ABAB5] dark:hover:text-white",
                        }}
                    />
                    <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x dark:divide-[#FFFFFF33]">
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {hours.reverse().map((hour) => (
                                    <Button
                                        key={hour}
                                        size="icon"
                                        variant={
                                            date && date.getHours() % 12 === hour % 12
                                                ? "default"
                                                : "ghost"
                                        }
                                        className={cn(
                                            "sm:w-full shrink-0 aspect-square",
                                            date && date.getHours() % 12 === hour % 12 &&
                                            "bg-[#0ABAB5] dark:text-white dark:hover:bg-[#0ABAB5] dark:hover:text-white"
                                        )}
                                        onClick={() => handleTimeChange("hour", hour.toString())}
                                    >
                                        {hour}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                                    <Button
                                        key={minute}
                                        size="icon"
                                        variant={
                                            date && date.getMinutes() === minute
                                                ? "default"
                                                : "ghost"
                                        }
                                        className={cn(
                                            "sm:w-full shrink-0 aspect-square",
                                            date && date.getMinutes() === minute &&
                                            "bg-[#0ABAB5] dark:text-white dark:hover:bg-[#0ABAB5] dark:hover:text-white"
                                        )}
                                        onClick={() =>
                                            handleTimeChange("minute", minute.toString())
                                        }
                                    >
                                        {minute}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                        <ScrollArea>
                            <div className="flex sm:flex-col p-2">
                                {["AM", "PM"].map((ampm) => (
                                    <Button
                                        key={ampm}
                                        size="icon"
                                        variant={
                                            date &&
                                                ((ampm === "AM" && date.getHours() < 12) ||
                                                    (ampm === "PM" && date.getHours() >= 12))
                                                ? "default"
                                                : "ghost"
                                        }
                                        className={cn(
                                            "sm:w-full shrink-0 aspect-square",
                                            date &&
                                            ((ampm === "AM" && date.getHours() < 12) ||
                                                (ampm === "PM" && date.getHours() >= 12)) &&
                                            "bg-[#0ABAB5] dark:text-white dark:hover:bg-[#0ABAB5] dark:hover:text-white"
                                        )}
                                        onClick={() => handleTimeChange("ampm", ampm)}
                                    >
                                        {ampm}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}