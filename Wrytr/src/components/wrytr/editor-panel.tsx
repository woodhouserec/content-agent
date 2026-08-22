import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  CodeSimple,
  DotsThree,
  Image,
  Link,
  ListBullets,
  ListNumbers,
  LinkedinLogo,
  Quotes,
  SlidersHorizontal,
  Sparkle,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  User,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { postParagraphs, promptActions, takeaways, toneControls } from "@/components/wrytr/prototype-data"
import { FieldShell, Panel } from "@/components/wrytr/ui-bits"
import { cn } from "@/lib/utils"

const toolbarGroups = [
  [TextB, TextItalic, TextUnderline, TextStrikethrough],
  [CodeSimple, TextHOne, TextHTwo],
  [ListBullets, ListNumbers],
  [Link, Quotes, Image],
]

export function EditorPanel() {
  return (
    <Panel className="min-w-0 flex-1">
      <div className="px-5 pt-5 pb-6 md:px-6 md:pt-6 md:pb-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-normal">Create post</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn your ideas and sources into a professional post.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="size-4 text-primary" />
            Autosaved just now
          </div>
        </header>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-2.5">
          {toneControls.map((control) => (
            <FieldShell key={control.label} label={control.label}>
              <Select defaultValue={control.value}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {control.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
          ))}
          <div className="flex min-w-0 items-end">
            <Button variant="secondary" className="h-10 w-full gap-2">
              <SlidersHorizontal className="size-4" />
              Customize
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Post title (optional)</span>
            <span>32/120</span>
          </div>
          <Input value="The future of remote work in 2025" readOnly className="h-10" />
        </div>

        <Card className="mt-4 gap-0 overflow-hidden rounded-lg py-0">
          <CardHeader className="flex min-h-11 flex-row flex-wrap items-center gap-1 border-b p-2 md:flex-nowrap md:overflow-x-auto">
            {toolbarGroups.map((group, index) => (
              <div key={index} className="flex shrink-0 items-center gap-1">
                {index > 0 && <Separator orientation="vertical" className="mx-1 h-5" />}
                {group.map((IconComponent) => (
                  <Button
                    key={IconComponent.displayName}
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconComponent className="size-4" />
                  </Button>
                ))}
              </div>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
              <Button variant="ghost" size="icon-sm">
                <ArrowCounterClockwise className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <ArrowClockwise className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="min-h-[352px] p-4 text-sm leading-5">
            {postParagraphs.map((paragraph) => (
              <p key={paragraph} className="mb-5 whitespace-pre-line">
                {paragraph}
              </p>
            ))}
            <ol className="grid list-decimal gap-2 pl-5">
              {takeaways.map((item) => (
                <li key={item.title}>
                  <span className="font-medium">{item.title}</span> {item.text}
                </li>
              ))}
            </ol>
            <p className="mt-7">The future of work is human-centered, tech-enabled, and built on trust.</p>
          </CardContent>

          <CardFooter className="flex h-9 items-center gap-2 bg-transparent px-4 text-xs text-muted-foreground">
            <span>138 words</span>
            <span>•</span>
            <span>842 characters</span>
            <LinkedinLogo className="ml-auto size-4 rounded bg-primary text-primary-foreground" weight="fill" />
          </CardFooter>
        </Card>

        <Card className="mt-3 flex-row items-center gap-3 rounded-lg p-3">
          <div className="grid flex-1 gap-1">
            <div className="text-sm font-medium">Ask wrytr</div>
            <Textarea
              readOnly
              value="What would you like to improve or change?"
              className="min-h-6 resize-none border-0 bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0"
            />
          </div>
          <Button size="icon-lg" className="rounded-full">
            <ArrowRight className="size-5" />
          </Button>
        </Card>

        <div className="mt-3 flex flex-wrap gap-2">
          {promptActions.map((action, index) => (
            <Button key={action} variant="outline" className="gap-2">
              {index === 0 && <Sparkle className="size-4 text-primary" />}
              {index === 3 && <User className="size-4" />}
              {action}
            </Button>
          ))}
          <Button variant="outline" size="icon">
            <DotsThree className="size-4" />
          </Button>
        </div>

        <footer className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="mr-3 text-sm font-medium">Versions</span>
            {["V1", "V2", "V3"].map((version, index) => (
              <Button
                key={version}
                variant={index === 0 ? "outline" : "secondary"}
                size="sm"
                className={cn(index === 0 && "border-primary text-primary")}
              >
                {version}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="ml-2">
              Compare
            </Button>
          </div>
          <div className="ml-auto flex min-w-fit flex-wrap gap-2">
            <Button variant="secondary" className="min-w-32">Save draft</Button>
            <Button className="min-w-40 gap-2">
              <Sparkle className="size-4" />
              Generate post
            </Button>
          </div>
        </footer>
      </div>
    </Panel>
  )
}
