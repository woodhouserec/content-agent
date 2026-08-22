import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  ChatCircle,
  Clock,
  Globe,
  Heart,
  Info,
  PaperPlane,
  Repeat,
  Timer,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { postParagraphs, takeaways } from "@/components/wrytr/prototype-data"
import { Panel, UserAvatar } from "@/components/wrytr/ui-bits"

function QualityRow({
  title,
  detail,
  score,
  value,
}: {
  title: string
  detail: string
  score?: string
  value?: number
}) {
  return (
    <Card className="gap-2 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">{title}</div>
        {score && <Badge variant="secondary">{score}</Badge>}
        <CaretRight className="ml-auto size-4 text-muted-foreground" />
      </div>
      {value !== undefined && <Progress value={value} className="mt-3" />}
      <div className="mt-2 text-xs text-muted-foreground">{detail}</div>
    </Card>
  )
}

export function PreviewPanel() {
  return (
    <Panel className="w-full p-5 lg:col-span-2 min-[1536px]:col-span-1 min-[1800px]:w-[510px]">
      <h2 className="text-sm font-medium">Post preview</h2>

      <Card className="mt-4 rounded-lg p-4">
        <CardHeader className="flex flex-row items-start gap-3 p-0">
          <UserAvatar size="lg" />
          <div>
            <div className="text-sm font-medium">Alex Mercer</div>
            <div className="text-xs text-muted-foreground">Independent Consultant</div>
            <div className="text-xs text-muted-foreground">Just now</div>
          </div>
        </CardHeader>

        <CardContent className="mt-5 p-0 text-sm leading-5">
          {postParagraphs.map((paragraph) => (
            <p key={paragraph} className="mb-4 whitespace-pre-line">
              {paragraph}
            </p>
          ))}
          <ol className="grid list-decimal gap-1.5 pl-5">
            {takeaways.map((item) => (
              <li key={item.title}>
                <span className="font-medium">{item.title}</span> {item.text}
              </li>
            ))}
          </ol>
          <p className="mt-5">The future of work is human-centered, tech-enabled, and built on trust.</p>
        </CardContent>

        <Separator className="my-4" />
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Heart className="size-4" />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <ChatCircle className="size-4" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Repeat className="size-4" />
            Repost
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2">
            <PaperPlane className="size-4" />
            Send
          </Button>
        </div>
      </Card>

      <div className="mt-3 grid gap-2">
        <QualityRow
          title="Hook quality"
          score="Great"
          value={84}
          detail="Your opening is strong and likely to grab attention."
        />
        <QualityRow title="Readability" score="81 /100" detail="Easy to read. Short sentences and clear structure." />
        <QualityRow title="Estimated read time" score="1 min 10 sec" detail="Optimized for LinkedIn scanning." />
      </div>

      <section className="mt-6 grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Schedule & publish</h3>
          <Button variant="outline" size="sm" className="gap-2">
            Best time: Tomorrow, 9:00 AM
            <CaretDown className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="justify-start gap-2">
            <CalendarBlank className="size-4" />
            May 27, 2025
          </Button>
          <Button variant="outline" className="justify-start gap-2">
            <Clock className="size-4" />
            09:00 AM
          </Button>
          <Button variant="outline" className="justify-start gap-2">
            <Globe className="size-4" />
            Europe/Berlin
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Timer className="size-4 text-muted-foreground" />
          Publish automatically
          <Info className="size-3.5 text-muted-foreground" />
          <Switch className="ml-auto" defaultChecked />
        </div>
      </section>
    </Panel>
  )
}
