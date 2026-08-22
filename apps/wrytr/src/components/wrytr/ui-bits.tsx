import type { Icon } from "@phosphor-icons/react"
import type * as React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function UserAvatar({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="bg-primary-foreground text-foreground">A</AvatarFallback>
    </Avatar>
  )
}

export function IconButton({
  label,
  icon: IconComponent,
  className,
}: {
  label: string
  icon: Icon
  className?: string
}) {
  return (
    <Button variant="outline" size="icon" aria-label={label} className={className}>
      <IconComponent />
    </Button>
  )
}

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("h-fit gap-0 rounded-lg bg-card py-0 shadow-sm", className)}>
      {children}
    </Card>
  )
}

export function FieldShell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
