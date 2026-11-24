# Settings Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two settings tabs, Sidebar presentation (settings left, live sidebar preview right) and About; drop host display names.
**Architecture:** Existing settings components become sections of one `PresentationSettings` screen beside a read-only `WorkspaceSidebar`; a `readOnly` flag in the sidebar context turns off row actions, menus and the header buttons. About renders the overview string and plugin details.
**Tech Stack:** TypeScript, React Native, `@getpaseo/plugin` 0.16.2 SDK, node:test via tsx.
**Spec:** `docs/superpowers/specs/2026-11-25-settings-layout-design.md`

## Global Constraints
- Defaults and the live sidebar stay as in 0.4.0; React Native primitives only; theme or palette colors.
- Feature detection of `addSettingsScreen` / `openSettings` stays.

## Review Focus
1. Tapping or long-pressing a row in the preview must not open a workspace, a menu, or archive anything.
2. A stored host `name` from 0.4.0 must parse and be ignored, not invalidate the document.
3. The About overview must match `OVERVIEW.md` exactly.
4. The preview must stay usable on a phone (stacked, scrollable).
5. The version shown in About must equal `package.json`'s.

---

### Task 1: Remove host display names
**Files:** `shared/preferences.ts`, `client/context.tsx`, `client/settings/hosts.tsx`, `tests/hosts.test.ts`, `tests/preferences.test.ts`, `tests/colors.test.ts`
- [ ] Tests: `label()` returns the host's Paseo label even when a stored override has `name: "Mini"`; parsing `{ hostOverrides: { a: { name: "Mini", color: "red", icon: "gpu" } } }` gives `{ a: { color: "red", icon: "gpu" } }`. Run: FAIL.
- [ ] Drop `name` from `hostOverride` (zod strips the stored key), from `makeHostDirectory`'s label, and the Display name input. Run tests and typecheck: PASS. Commit.

### Task 2: About content and version
**Files:** create `shared/about.ts` (`VERSION: string`, `OVERVIEW: string`, `LINKS: { github; registry; npm }`), `tests/about.test.ts`
- [ ] Tests: `VERSION === package.json version`; `OVERVIEW === readFileSync("OVERVIEW.md")`. Run: FAIL.
- [ ] Implement constants (overview copied verbatim). Run: PASS. Commit.

### Task 3: Presentation screen, preview and About screen
**Files:** create `client/settings/presentation.tsx`, `client/settings/about.tsx`; modify `client/settings/{appearance,hosts,projects}.tsx` into section components, `client/context.tsx` (`readOnly?: boolean`), `client/sidebar.tsx` (accept `readOnly`), `client/workspace-row.tsx`, `client/sections.tsx`, `index.client.tsx`
- [ ] `PresentationSettings(props: PluginSurfaceProps)`: measure width with `onLayout`; at ≥ 640 a row of settings (flex 1) and a 300×560 preview; below, preview 420 tall then settings. Preview = `WorkspaceSidebar` with the surface's theme, `layout` from props, `active: { workspace: null, agent: null }`, no-op navigation and `dismiss`, `readOnly`, inside a bordered rounded `View` titled "Preview".
- [ ] `readOnly`: rows ignore press and long press, show no hover buttons, menus or touch kebab; the Workspaces header shows no buttons. Section, host, project and status folding still work.
- [ ] `AboutSettings`: `Markdown` with `OVERVIEW`, then a details card (Version, Plugin ID `paseo-lucid-sidebar`, Author `yiju-zhao`, License MIT) and link rows opening `LINKS` with `openExternalUrl`.
- [ ] Register `presentation` ("Sidebar presentation", `PanelLeft`) and `about` ("About", `Info`); `openSettings("presentation")`.
- [ ] Verify: typecheck, tests, DOM audit, reload, screenshot the settings page if reachable. Commit.

### Task 4: Docs
- [ ] OVERVIEW (both languages): the settings bullet says the page previews the sidebar live and drops "names". Re-sync `shared/about.ts`. README layout table: replace the three settings files with `presentation.tsx`, `about.tsx`. Tests green. Commit.
