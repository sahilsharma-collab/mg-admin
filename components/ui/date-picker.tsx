"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  className?: string;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  maxDate?: Date;
  placeholder?: string;
}

export function DatePicker({
  className,
  date,
  setDate,
  maxDate,
  placeholder,
}: DatePickerProps): React.ReactElement {
  const normalizedMaxDate = React.useMemo(() => {
    if (!maxDate) return undefined;
    return new Date(
      maxDate.getFullYear(),
      maxDate.getMonth(),
      maxDate.getDate()
    );
  }, [maxDate]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-start text-left font-normal dark:bg-[#2E2941] border border-[#0000001A] focus:ring-[0.1px] focus:ring-[#0ABAB5] focus:border-[#0ABAB5]",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP")
          ) : (
            <span className="text-muted-foreground">
              {placeholder || "Pick a date"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 dark:bg-[#2E2941] dark:border-[#FFFFFF33]"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className="dark:bg-[#2E2941]"
          toDate={normalizedMaxDate}
          disabled={
            normalizedMaxDate ? (d) => d > normalizedMaxDate : undefined
          }
          classNames={{
            day_selected:
              "dark:bg-[#0ABAB5] dark:text-white dark:hover:bg-[#0ABAB5] dark:hover:text-white",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
