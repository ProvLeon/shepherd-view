import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        // Default - uses brand blue
        default: "bg-agape-blue text-white hover:bg-agape-blue/90 focus-visible:ring-agape-blue shadow-sm",

        // Brand variants
        primary: "bg-linear-to-r from-agape-blue to-agape-purple text-white hover:from-agape-blue/90 hover:to-agape-purple/90 shadow-md hover:shadow-lg",
        red: "bg-agape-red text-white hover:bg-agape-red/90 focus-visible:ring-agape-red shadow-sm",
        purple: "bg-agape-purple text-white hover:bg-agape-purple/90 focus-visible:ring-agape-purple shadow-sm",

        // Standard variants
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
        outline: "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
        "outline-primary": "border-2 border-agape-blue text-agape-blue bg-white hover:bg-agape-blue/5",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        link: "text-agape-blue underline-offset-4 hover:underline p-0 h-auto",

        // Success variant for positive actions
        success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs",
        sm: "h-9 rounded-md px-3 gap-1.5",
        lg: "h-11 rounded-lg px-6 text-base",
        xl: "h-12 rounded-xl px-8 text-base font-semibold",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

