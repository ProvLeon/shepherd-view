import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "elevated" | "outlined" | "gradient"
    padding?: "none" | "sm" | "default" | "lg"
}

function Card({
    className,
    variant = "default",
    padding = "default",
    children,
    ...props
}: CardProps) {
    const variantClasses = {
        default: "bg-white border border-gray-100 shadow-sm",
        elevated: "bg-white shadow-md hover:shadow-lg transition-shadow",
        outlined: "bg-white border-2 border-gray-200",
        gradient: "bg-linear-to-br from-white to-gray-50 border border-gray-100 shadow-sm",
    }

    const paddingClasses = {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
    }

    return (
        <div
            data-slot="card"
            className={cn(
                "rounded-xl",
                variantClasses[variant],
                paddingClasses[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description?: string
    action?: React.ReactNode
    icon?: React.ReactNode
}

function CardHeader({
    className,
    title,
    description,
    action,
    icon,
    ...props
}: CardHeaderProps) {
    return (
        <div
            data-slot="card-header"
            className={cn("flex items-start justify-between gap-4", className)}
            {...props}
        >
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="p-2 rounded-lg bg-agape-blue/10 text-agape-blue shrink-0">
                        {icon}
                    </div>
                )}
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {description && (
                        <p className="text-sm text-gray-500">{description}</p>
                    )}
                </div>
            </div>
            {action && (
                <div className="shrink-0">{action}</div>
            )}
        </div>
    )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

function CardContent({ className, ...props }: CardContentProps) {
    return (
        <div
            data-slot="card-content"
            className={cn("mt-4", className)}
            {...props}
        />
    )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

function CardFooter({ className, ...props }: CardFooterProps) {
    return (
        <div
            data-slot="card-footer"
            className={cn("mt-4 pt-4 border-t border-gray-100 flex items-center gap-3", className)}
            {...props}
        />
    )
}

// Stat Card - a specialized card for displaying metrics
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string
    value: string | number
    change?: {
        value: string
        positive?: boolean
    }
    icon?: React.ReactNode
    color?: "blue" | "red" | "purple" | "green" | "amber" | "gray"
}

function StatCard({
    className,
    label,
    value,
    change,
    icon,
    color = "blue",
    ...props
}: StatCardProps) {
    const colorClasses = {
        blue: "bg-agape-blue/10 text-agape-blue",
        red: "bg-agape-red/10 text-agape-red",
        purple: "bg-agape-purple/10 text-agape-purple",
        green: "bg-green-100 text-green-600",
        amber: "bg-amber-100 text-amber-600",
        gray: "bg-gray-100 text-gray-600",
    }

    return (
        <Card className={cn("", className)} {...props}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {change && (
                        <p className={cn(
                            "text-xs font-medium mt-2",
                            change.positive ? "text-green-600" : "text-red-600"
                        )}>
                            {change.positive ? "↑" : "↓"} {change.value}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className={cn("p-3 rounded-xl", colorClasses[color])}>
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    )
}


interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

function CardTitle({ className, ...props }: CardTitleProps) {
    return (
        <h3
            data-slot="card-title"
            className={cn("text-lg font-semibold text-gray-900", className)}
            {...props}
        />
    )
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

function CardDescription({ className, ...props }: CardDescriptionProps) {
    return (
        <p
            data-slot="card-description"
            className={cn("text-sm text-gray-500", className)}
            {...props}
        />
    )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard }
