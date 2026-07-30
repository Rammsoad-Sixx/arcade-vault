# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Skills

Usa siempre /front-design para diseñar la interfaz de usuario.

## Project

Arcade Vault — a platform to play games online and compete for points ("Es una plataforma para jugar online y competir por la mayor cantidad de puntos"). Currently a fresh `create-next-app` scaffold; no game/scoring features are implemented yet.

Intended to follow Spec Driven Design (`/spec` and `/spec-impl`) per the [fernando-skills](https://github.com/Klerith/fernando-skills) conventions (installed via `npx skills@latest add Klerith/fernando-skills`). No spec files or `.claude/skills` exist in the repo yet — check for these before assuming the workflow is active.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint.config.mjs)
```

There is no test setup (no test script, no test files, no test runner dependency) — do not assume Jest/Vitest/Playwright are configured.

## Critical: this is not the Next.js you know

This repo pins `next@16.2.12`. Per `AGENTS.md`, treat this as a version with breaking changes relative to training data — **read the relevant page under `node_modules/next/dist/docs/` before writing code that touches routing, caching, data fetching, or proxy/middleware**, and follow any deprecation notices found there. Two changes that are easy to get wrong from memory:

- **`middleware.ts` is deprecated → renamed to `proxy.ts`.** The exported function is `proxy` (not `middleware`), file lives at project root (or `src/`) next to `app/`. See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **Cache Components (`use cache` / `cacheLife` / `cacheTag`) replace route segment configs** (`export const dynamic`, `revalidate`, `fetchCache`) when `cacheComponents: true` is set in `next.config.ts`. This flag is **not currently enabled** (`next.config.ts` is empty) — the classic fetch-cache/route-segment-config model applies until it is. Check `next.config.ts` before assuming which caching model is in effect. See `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` and `.../02-guides/migrating-to-cache-components.md`.

When in doubt about any App Router API, prefer reading the bundled docs over relying on prior Next.js knowledge.

## Architecture

- **App Router only** (`app/`), TypeScript, React 19. No `pages/` directory.
- `app/layout.tsx` — root layout; loads `Geist`/`Geist_Mono` via `next/font/google` and exposes them as CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- `app/page.tsx` — home route (still the default create-next-app starter content).
- `app/globals.css` — Tailwind CSS v4 entry point, loaded via `@tailwindcss/postcss` (configured in `postcss.config.mjs`); there is no `tailwind.config.js` (v4 is CSS-first).
- Path alias `@/*` → project root (`tsconfig.json`).
- `public/` — static assets served at `/`.
