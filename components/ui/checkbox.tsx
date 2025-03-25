"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  indeterminate = false,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-[4px] border border-gray-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ABAB5]/50 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[#0ABAB5] data-[state=checked]:border-[#0ABAB5]",
        indeterminate && "bg-gray-400 border-gray-600",
        "hover:bg-gray-300 transition-colors duration-300 dark:hover:bg-gray-700 cursor-pointer",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "flex items-center justify-center",
          indeterminate ? "text-gray-800" : "text-white",
          "rounded-[4px] transition-colors"
        )}
        forceMount={indeterminate ? true : undefined}
      >
        {indeterminate ? (
          <MinusIcon className="h-3 w-3" />
        ) : (
          <CheckIcon className="h-3 w-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }