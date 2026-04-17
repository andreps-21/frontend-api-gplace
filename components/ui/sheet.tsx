"use client"

import * as React from "react"
import { Drawer } from "vaul"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type SheetProps = React.ComponentProps<typeof Drawer.Root>

function Sheet({ shouldScaleBackground = false, ...props }: SheetProps) {
  return <Drawer.Root direction="right" shouldScaleBackground={shouldScaleBackground} {...props} />
}

const SheetTrigger = Drawer.Trigger
const SheetClose = Drawer.Close

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Drawer.Content>,
  React.ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, children, ...props }, ref) => (
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <Drawer.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full max-h-[100dvh] w-full flex-col border-l bg-background shadow-lg outline-none",
        "max-w-lg",
        className
      )}
      {...props}
    >
      {children}
      <Drawer.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </Drawer.Close>
    </Drawer.Content>
  </Drawer.Portal>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 border-b px-6 py-4 pr-12 text-left", className)} {...props} />
)

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Drawer.Title>,
  React.ComponentPropsWithoutRef<typeof Drawer.Title>
>(({ className, ...props }, ref) => (
  <Drawer.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Drawer.Description>,
  React.ComponentPropsWithoutRef<typeof Drawer.Description>
>(({ className, ...props }, ref) => (
  <Drawer.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
SheetDescription.displayName = "SheetDescription"

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
