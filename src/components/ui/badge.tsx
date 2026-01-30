import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                // Brand colors
                default: "bg-agape-blue/10 text-agape-blue",
                red: "bg-agape-red/10 text-agape-red",
                purple: "bg-agape-purple/10 text-agape-purple",

                // Semantic colors
                success: "bg-green-100 text-green-700",
                warning: "bg-amber-100 text-amber-700",
                error: "bg-red-100 text-red-700",
                info: "bg-blue-100 text-blue-700",

                // Neutral
                secondary: "bg-gray-100 text-gray-600",
                outline: "border border-gray-200 text-gray-600 bg-white",

                // Solid variants
                "solid-blue": "bg-agape-blue text-white",
                "solid-red": "bg-agape-red text-white",
                "solid-purple": "bg-agape-purple text-white",
                "solid-success": "bg-green-600 text-white",
            },
            size: {
                default: "text-xs px-2.5 py-0.5",
                sm: "text-[10px] px-2 py-0.5",
                lg: "text-sm px-3 py-1",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {icon}
            {children}
        </span>
    )
}

export { Badge, badgeVariants }
