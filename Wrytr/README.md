# Wrytr Web

This folder contains the early Wrytr web interface prototype.

It is intentionally kept as a separate subproject from the Cloudflare Worker so the current Telegram/Worker production flow can stay stable while the SaaS web interface evolves.

## Current Status

- React + TypeScript + Vite
- shadcn/ui component set
- Wrytr dashboard prototype screens
- floating collapsible sidebar
- local-only UI prototype, not connected to the production Worker yet

## Local Commands

From the repository root:

```bash
pnpm --dir Wrytr dev
pnpm --dir Wrytr build
```

Or through the root package scripts:

```bash
npm run wrytr:dev
npm run wrytr:build
```
