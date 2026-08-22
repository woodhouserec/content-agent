import type * as React from "react"
import {
  Bell,
  CaretDown,
  Command,
  MagnifyingGlass,
  Moon,
  Sun,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EditorPanel } from "@/components/wrytr/editor-panel"
import { PreviewPanel } from "@/components/wrytr/preview-panel"
import { AppSidebar } from "@/components/wrytr/sidebar"
import { SourcePanel } from "@/components/wrytr/source-panel"
import { UserAvatar } from "@/components/wrytr/ui-bits"

export function App() {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
        className="min-h-svh bg-background text-foreground"
      >
        <div className="flex min-h-svh w-full bg-background">
          <AppSidebar />
          <SidebarInset className="min-w-0 bg-background p-(--wrytr-gap) [--wrytr-gap:--spacing(4)] md:[--wrytr-gap:--spacing(5)]">
            <TopBar />
            <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-(--wrytr-gap) pt-(--wrytr-gap) lg:grid-cols-[320px_minmax(0,1fr)] min-[1536px]:grid-cols-[300px_minmax(560px,1fr)_minmax(380px,440px)] min-[1800px]:grid-cols-[320px_minmax(680px,1fr)_510px]">
              <SourcePanel />
              <EditorPanel />
              <PreviewPanel />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function TopBar() {
  const { theme, setTheme } = useTheme()
  const isLight = theme === "light"

  return (
    <header className="flex h-12 items-center justify-between gap-3">
      <SidebarTrigger className="size-9 rounded-lg md:hidden" />
      <div className="flex min-w-0 items-center justify-end gap-3">
        <div className="relative hidden w-[350px] lg:block">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 pr-12" placeholder="Search" />
          <div className="pointer-events-none absolute right-2 top-1/2 flex h-6 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 text-xs text-muted-foreground">
            <Command className="size-3" /> K
          </div>
        </div>
        <Button variant="outline" size="icon-lg" className="relative">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
          onClick={() => setTheme(isLight ? "dark" : "light")}
        >
          {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
        <Button variant="outline" className="h-9 gap-3 px-3">
          <UserAvatar size="sm" />
          <span className="hidden text-sm sm:inline">Alex Mercer</span>
          <CaretDown className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  )
}

export default App
