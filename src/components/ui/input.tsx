import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full min-w-0 rounded-lg border bg-white px-3.5 py-2.5 text-base shadow-sm transition-all outline-none placeholder:text-gray-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-gray-200 focus:border-agape-blue focus:ring-2 focus:ring-agape-blue/20",
        error: "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900 placeholder:text-red-400",
        success: "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
      },
      inputSize: {
        default: "h-10",
        sm: "h-9 px-3 py-2 text-sm",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
  VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

function Input({
  className,
  type,
  variant,
  inputSize,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          data-slot="input"
          className={cn(
            inputVariants({ variant, inputSize }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, inputSize }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }

