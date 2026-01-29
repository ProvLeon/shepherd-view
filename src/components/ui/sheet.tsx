import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

interface SheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}

interface SheetContentProps {
    children: React.ReactNode
    className?: string
    side?: "left" | "right"
}

const SheetContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => { } })

export function Sheet({ open, onOpenChange, children }: SheetProps) {
    return (
        <SheetContext.Provider value={{ open, onOpenChange }}>
            {children}
        </SheetContext.Provider>
    )
}

export function SheetTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
    const { onOpenChange } = React.useContext(SheetContext)

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
                (children as React.ReactElement<any>).props.onClick?.(e)
                onOpenChange(true)
            }
        })
    }

    return (
        <button onClick={() => onOpenChange(true)}>
            {children}
        </button>
    )
}

export function SheetContent({ children, className, side = "right" }: SheetContentProps) {
    const { open, onOpenChange } = React.useContext(SheetContext)

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0"
                onClick={() => onOpenChange(false)}
            />

            {/* Panel */}
            <div
                className={cn(
                    "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    side === "right" && "inset-y-0 right-0 h-full w-full sm:w-[400px] md:w-[500px] border-l animate-in slide-in-from-right",
                    side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm animate-in slide-in-from-left",
                    className
                )}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>
                {children}
            </div>
        </>
    )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
            {...props}
        />
    )
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2
            className={cn("text-lg font-semibold text-gray-900", className)}
            {...props}
        />
    )
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("text-sm text-gray-500", className)}
            {...props}
        />
    )
}
