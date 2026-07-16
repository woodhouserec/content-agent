import { handleFetch } from "./app/router";
import type { Env, ExecutionContext, ScheduledController } from "./domain/runtime";
import { handleScheduled } from "./scheduled/handler";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleFetch(request, env, ctx);
  },

  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(handleScheduled(controller, env));
  }
};
