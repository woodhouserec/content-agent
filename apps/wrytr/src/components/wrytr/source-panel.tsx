import { CaretRight, CheckCircle, Plus } from "@phosphor-icons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Panel } from "@/components/wrytr/ui-bits"

export function SourcePanel() {
  return (
    <Panel className="w-full overflow-hidden lg:w-80">
      <div className="grid gap-5 p-5">
        <div>
          <h2 className="text-sm font-medium">Source</h2>
          <Tabs defaultValue="topic" className="mt-4">
            <TabsList variant="line" className="grid h-8 w-full grid-cols-3">
              <TabsTrigger value="topic">Topic</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="rss">RSS</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Topic</div>
          <Textarea
            value={"The future of remote work\nin 2025"}
            readOnly
            className="min-h-24 resize-none"
          />
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm">
              <Plus className="size-3.5" />
              Add details
            </Button>
            <span className="text-xs text-muted-foreground">37/200</span>
          </div>
        </div>

        <div className="mt-7 grid gap-3">
          <div className="text-xs font-medium">Source preview</div>
          <Card className="rounded-lg py-0">
            <CardHeader className="pt-4">
              <div className="flex items-center gap-3">
                <Avatar size="lg" className="rounded-lg after:rounded-lg">
                  <AvatarFallback className="rounded-[inherit] bg-primary text-primary-foreground">G</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm">Gartner Research</CardTitle>
                  <div className="text-xs text-muted-foreground">gartner.com • 2d ago</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pb-5">
              <h3 className="text-base font-medium leading-snug">
                Top 5 Remote Work Trends Shaping 2025
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Gartner explores how hybrid models, AI collaboration tools and flexible policies
                are driving productivity and employee satisfaction in 2025.
              </p>
            </CardContent>
            <CardFooter className="justify-between bg-transparent">
              <span>5 key takeaways</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </CardFooter>
          </Card>
        </div>

        <Button variant="outline" className="mt-2 h-10">
          <Plus className="size-4" />
          Add source
        </Button>
      </div>

      <div className="mt-auto">
        <Separator />
        <div className="flex items-center gap-2 p-5 text-sm">
          <CheckCircle className="size-4 text-primary" />
          <span>1 source added</span>
          <Badge variant="secondary" className="ml-auto">
            Ready
          </Badge>
        </div>
      </div>
    </Panel>
  )
}
