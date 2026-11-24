# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plugin settings page (Appearance, Hosts, Projects tabs) whose options restyle the Lucid sidebar live, and release it as 0.4.0.

**Architecture:** New preference fields live in the existing device-scoped `sidebar` settings document (version 5). Pure resolver modules turn preferences into colors (`client/colors.ts`), sizes (`client/density.ts`) and times (`client/model.ts`); the sidebar context exposes them, and components read them instead of constants. The settings page is three screens registered with `client.addSettingsScreen`, editing the same document through `usePreferences`.

**Tech Stack:** TypeScript, React Native (react-native-web on desktop), `@getpaseo/plugin` 0.16.2 SDK, zod 4, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-11-24-settings-design.md`

## Global Constraints

- `requirements.paseo` stays `>=0.16.1`; `addSettingsScreen` / `openSettings` are feature-detected (`typeof client.addSettingsScreen === "function"`), and without them the page and the **All settings…** item are simply absent.
- Defaults must reproduce 0.3.1 exactly: preset Default, density Standard, tag style Solid, guide lines Thin, time Relative, no host or project overrides.
- Anything the sidebar display menu can do stays out of the settings page. No host visibility switch on the Hosts tab.
- Colors only from the fixed named palette (`violet, sky, emerald, orange, pink, indigo, teal, red, amber, blue`), each with fill, dark-text and light-text variants; no free hex input.
- An explicit host or project color wins over the preset's auto color.
- Touch layouts (`touch` in the sidebar context) keep row and header minimum height 44 at every density; density changes only spacing there. The Appearance tab shows the hint: "On touch screens rows keep a comfortable tap size; density changes the spacing."
- Absolute time: same local day `HH:MM` (24-hour, zero-padded), otherwise `Mon D` (e.g. `Nov 8`).
- Client code: React Native primitives only; text colors from the theme or the palette; must pass `npm run typecheck` and the DOM audit in README's development notes.
- Prettier printWidth 100; commits use the repo-local noreply email and end with the `Co-Authored-By` line.

## Review Focus

1. A host display name that is empty or only spaces must fall back to the host's own label, everywhere (heading, filter list).
2. Stored overrides for a host or project that no longer exists must be ignored without errors; the Hosts tab lists only hosts from `useHosts()`, the Projects tab only current projects.
3. An unknown enum value in stored settings (written by a newer version) must not make the whole document `invalid`; it falls back to that field's default.
4. Absolute time at a different day but under 24 hours ago (e.g. 23:50 yesterday, now 00:10) must show `Nov 23`, not a clock time.
5. Changing density or preset while a row's menu is open must not close the menu or lose rename text (resolvers are memoized from preference values, not remounted).

---

### Task 1: Settings schema v5

**Files:**
- Modify: `shared/preferences.ts`
- Test: `tests/preferences.test.ts`

**Interfaces:**
- Produces (exported from `shared/preferences.ts`):
  - `COLOR_NAMES = ["violet","sky","emerald","orange","pink","indigo","teal","red","amber","blue"] as const`, `type ColorName`
  - `PRESETS = ["default","soft","vivid","mono"]`, `DENSITIES = ["compact","standard","comfortable"]`, `TAG_STYLES = ["solid","tinted","outline"]`, `GUIDES = ["off","thin","thick"]`, `TIME_FORMATS = ["relative","absolute"]`, `HOST_ICONS = ["auto","laptop","desktop","server","gpu","cloud"]`, each with its `type`.
  - `SidebarPreferences` gains `appearance: { preset, density, tagStyle, guides, timeFormat }`, `hostOverrides: Record<string, { name: string; color: ColorName | "auto"; icon: HostIcon }>` keyed by server id, `projectColors: Record<string, ColorName>` keyed by project view key.

- [ ] **Step 1: Write the failing tests** in `tests/preferences.test.ts`:

```ts
it("defaults reproduce 0.3.1", () => {
  assert.deepEqual(DEFAULT_PREFERENCES.appearance, {
    preset: "default", density: "standard", tagStyle: "solid", guides: "thin", timeFormat: "relative",
  });
  assert.deepEqual(DEFAULT_PREFERENCES.hostOverrides, {});
  assert.deepEqual(DEFAULT_PREFERENCES.projectColors, {});
});
it("keeps a v4 document's values and adds appearance", () => {
  const next = migrate({ grouping: "status", rowItems: { host: false } }, 4);
  assert.equal(next.grouping, "status");
  assert.equal(next.rowItems.host, false);
  assert.equal(next.appearance.density, "standard");
});
it("falls back per field on unknown stored values", () => {
  const next = sidebarSettings.schema.parse({
    appearance: { preset: "neon", density: "compact" },
    hostOverrides: { srv_a: { name: "Mini", color: "magenta", icon: "toaster" } },
    projectColors: { repo: "magenta", ok: "teal" },
  });
  assert.equal(next.appearance.preset, "default");
  assert.equal(next.appearance.density, "compact");
  assert.deepEqual(next.hostOverrides.srv_a, { name: "Mini", color: "auto", icon: "auto" });
  assert.deepEqual(next.projectColors, { ok: "teal" });
});
```

- [ ] **Step 2: Run** `npm test` — expect the three new tests to FAIL (`appearance` undefined).
- [ ] **Step 3: Implement** in `shared/preferences.ts`: add the constants and fields; every enum uses `.catch(<default>)` so a bad value falls back per field; `hostOverrides` is `z.record(z.string(), hostOverride).catch({})` where `hostOverride` fields each `.catch` to `""` / `"auto"` / `"auto"`; `projectColors` is a record whose invalid entries are dropped (parse with `z.record(z.string(), z.unknown())` then `.transform` keeping values in `COLOR_NAMES`). `appearance` uses `.prefault({})`. Bump `version` to 5; `migrate` needs no new branch (defaults fill new fields).
- [ ] **Step 4: Run** `npm test` and `npm run typecheck` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Add appearance, host and project settings to the schema (v5)"`.

### Task 2: Color resolution

**Files:**
- Create: `client/colors.ts`
- Modify: `client/palette.ts` (remove `IDENTITY`, `identityColor`; keep `IdentityColor` type and `withAlpha`), `client/context.tsx`, `client/indicators.tsx`, `client/row-items.tsx`, `client/row-menu.tsx`, `client/display-menu.tsx`, `client/sections.tsx`
- Test: `tests/colors.test.ts`

**Interfaces:**
- Consumes: `ColorName`, `Preset`, `SidebarPreferences` (Task 1); `IdentityColor` from `client/palette.ts`.
- Produces:
  - `colorFor(name: ColorName, preset: Preset, dark: boolean): IdentityColor`
  - `autoColorName(key: string): ColorName` (the existing hash `h = (h*31 + charCode) >>> 0` modulo 10 over `COLOR_NAMES`, so Default auto colors equal 0.3.1's)
  - `interface Colors { host(hostId: string): IdentityColor; project(viewKey: string): IdentityColor; label(labelKey: string): IdentityColor; named(name: ColorName): IdentityColor }`
  - `makeColors(values: Pick<SidebarPreferences, "appearance" | "hostOverrides" | "projectColors">, dark: boolean): Colors`
  - `SidebarContextValue.colors: Colors`; `makeHostDirectory(list, localHostId, colors: Colors)` (the `dark` parameter goes away), and `HostDirectory.color(hostId)` delegates to `colors.host`. Task 5 inserts an `overrides` parameter before `colors`.

- [ ] **Step 1: Write the failing tests** in `tests/colors.test.ts`: Default preset `colorFor("violet","default",true)` equals `{ fill: "#7a6aa8", text: "#a392d5", tint: "#7a6aa81a" }` and light text `#6d49b5` (0.3.1 values); `makeColors(defaults, true).project("repo")` equals `colorFor(autoColorName("repo"), "default", true)`; with `projectColors: { repo: "teal" }` it equals `colorFor("teal", preset, dark)` for every preset; with `hostOverrides: { srv: { name: "", color: "red", icon: "auto" } }` `host("srv").fill === colorFor("red", …).fill`; `color: "auto"` falls back to the auto color; every preset defines all ten names with three 7-digit hex strings.
- [ ] **Step 2: Run** `npm test` — FAIL (module missing).
- [ ] **Step 3: Implement** `client/colors.ts`: `PALETTES: Record<Preset, Record<ColorName, { base; darkText; lightText }>>`. Default = today's `IDENTITY` table mapped to names in order. Soft, Vivid and Mono values are the builder's choice (Soft: lighter, less saturated fills; Vivid: more saturated; Mono: grays from `#5f6368` to `#9aa0a6` with readable text variants), keeping white text legible on `base` and `darkText`/`lightText` legible on the sidebar backgrounds. Labels follow the preset via `label(key) = colorFor(autoColorName(key), preset, dark)`.
- [ ] **Step 4: Wire**: build `colors` with `useMemo` in `SidebarContent` from `appearance`, `hostOverrides`, `projectColors`, `palette.dark`; pass to `makeHostDirectory`; replace every `identityColor(...)` call listed in Files with `colors.project / colors.label / colors.host` from `useSidebar()`.
- [ ] **Step 5: Run** `npm test`, `npm run typecheck`, `npx tsc --noEmit --noUnusedLocals` — PASS, no `identityColor` left (`grep -rn identityColor client` empty).
- [ ] **Step 6: Commit** `git commit -m "Resolve colors from presets and overrides"`.

### Task 3: Density

**Files:**
- Create: `client/density.ts`
- Modify: `client/layout.ts` (`ListState`, `buildProjects`, remove `PROJECT_SPACING`/`HEADER_MARGIN` constants), `client/sections.tsx`, `client/workspace-row.tsx`, `client/context.tsx`, `client/sidebar.tsx`
- Test: `tests/density.test.ts`, `tests/layout.test.ts`

**Interfaces:**
- Produces:
  - `interface Metrics { rowMinHeight: number; rowPaddingY: number; projectRowPaddingY: number; headerMinHeight: number; headerPaddingY: number; projectHeaderMinHeight: number; projectHeaderPaddingY: number; headerMargin: number; projectSpacing: number; statusSpacing: number }`
  - `metricsFor(density: Density, touch: boolean): Metrics`
  - `ListState.spacing: { project: number; headerMargin: number }` (replaces the constants; `guideBottom = (last.spacing || spacing.headerMargin) + 2`)
  - `SidebarContextValue.metrics: Metrics`
- Standard pointer values (0.3.1): rowMinHeight 36, rowPaddingY 8, projectRowPaddingY 6, headerMinHeight 36, headerPaddingY 8, projectHeaderMinHeight 30, projectHeaderPaddingY 5, headerMargin 2, projectSpacing 6, statusSpacing 12. Touch: every min height 44 and paddings as Standard touch today (rowPaddingY 8, projectRowPaddingY 8, headerPaddingY 8, projectHeaderPaddingY 8) at all densities; only `projectSpacing`, `statusSpacing`, `headerMargin` vary on touch. Compact/Comfortable pointer numbers are the builder's choice (Compact smaller, Comfortable larger, all ≥ 0).

- [ ] **Step 1: Write the failing tests**: `metricsFor("standard", false)` deep-equals the Standard values above; `metricsFor(d, true).rowMinHeight === 44` and `.headerMinHeight === 44` for every density; compact pointer `rowMinHeight < 36`, comfortable `> 36`; compact `projectSpacing` ≤ standard ≤ comfortable for both touch values. In `tests/layout.test.ts` replace `HEADER_MARGIN` imports with a `state()` default `spacing: { project: 6, headerMargin: 2 }` and assert `guideBottom === 2 + 2` for a folded block.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** `client/density.ts`, thread `spacing` through `ListState` from `metrics` in `SidebarContent`, and replace the literal sizes in `DisclosureRow`, `SectionHeader`, `StatusGroupView` (`paddingBottom`), `ProjectBlockView` and `Row` with `useSidebar().metrics` fields.
- [ ] **Step 4: Run** tests, typecheck — PASS. Reload (`paseo plugin reload paseo-lucid-sidebar`) and check the sidebar looks unchanged at Standard.
- [ ] **Step 5: Commit** `git commit -m "Size rows and spacing from a density table"`.

### Task 4: Tag style, guide lines and time format

**Files:**
- Modify: `client/model.ts`, `client/row-items.tsx`, `client/sections.tsx` (`HostGroup`), `client/workspace-row.tsx` (`TrailingValue`)
- Test: `tests/model.test.ts` (create)

**Interfaces:**
- Produces: `formatTime(at: string | null, now: number, format: TimeFormat): string | null` in `client/model.ts`; relative delegates to the existing `formatAge`.

- [ ] **Step 1: Write the failing tests** for `formatTime` with fixed local dates built via `new Date(2026, 10, 24, 9, 5)`: absolute same day → `"09:05"`; yesterday 23:50 with now 00:10 → `"Nov 23"`; `null` → `null`; relative equals `formatAge`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `formatTime`; use it in `TrailingValue` with `appearance.timeFormat`.
- [ ] **Step 4: Tag style** in `row-items.tsx` `Chip`: Solid = fill background + `palette.onIdentity` text (project tag today); Tinted = `tint` background + `text` color; Outline = transparent background, 1px `text`-colored border, `text` color. Project tag uses the chosen style (bold rule unchanged); label chips use Tinted unless the style is Outline.
- [ ] **Step 5: Guide lines** in `HostGroup`: `off` renders no line, `thin` width 1 (today), `thick` width 2 with `left` adjusted so the line stays centred on `guideX`.
- [ ] **Step 6: Run** tests, typecheck — PASS; commit `git commit -m "Apply tag style, guide lines and time format"`.

### Task 5: Host names and icons

**Files:**
- Modify: `client/context.tsx` (`HostDirectory`, `makeHostDirectory`), `client/sections.tsx` (`HostGroup` icon), `client/display-menu.tsx` (host filter list labels)
- Test: `tests/hosts.test.ts` (create)

**Interfaces:**
- Produces: `HostDirectory.icon(hostId: string): string` (Lucide name); `makeHostDirectory(list, localHostId, overrides: SidebarPreferences["hostOverrides"], colors: Colors): HostDirectory`. Icon map: auto → `Monitor` for the local host, `Server` otherwise; laptop `Laptop`, desktop `Monitor`, server `Server`, gpu `Cpu`, cloud `Cloud`.

- [ ] **Step 1: Write the failing tests** (pure `makeHostDirectory`): override name `"Mini"` → `label("srv") === "Mini"`; name `"   "` → the host's own label; unknown host id → its id as label, `Server` icon, no throw; `icon` for local auto is `Monitor`, gpu is `Cpu`; `compare` sorts by the custom label.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; `HostGroup` uses `hosts.icon(hostId)`; display menu host filter rows use `hosts.label(host.serverId)`.
- [ ] **Step 4: Run** tests, typecheck — PASS; commit `git commit -m "Let hosts carry a custom name and icon"`.

### Task 6: Settings page and All settings item

**Files:**
- Create: `client/settings/appearance.tsx`, `client/settings/hosts.tsx`, `client/settings/projects.tsx`
- Modify: `index.client.tsx`, `client/sidebar.tsx` (accept `openSettings?: () => void`), `client/context.tsx` (`openSettings?: () => void`), `client/display-menu.tsx`

**Interfaces:**
- Consumes: `usePreferences()` (`values`, `update`), `makeColors`, `COLOR_NAMES`, enums from Task 1, `useHosts`, `useProjects`, `RuntimeProvider` / `useProjectDirectory` (with `watchWorkspaces={false}`) for project view keys.
- Produces: screens `{ id: "appearance", title: "Appearance", icon: "Palette" }`, `{ id: "hosts", title: "Hosts", icon: "Server" }`, `{ id: "projects", title: "Projects", icon: "Folder" }`, registered in that order; `WorkspaceSidebar` props gain `openSettings`.

- [ ] **Step 1: Appearance tab**: one `SettingsSection` "Appearance" with `SettingsSelect` rows for preset, density (hint from Global Constraints), tag style, guide lines, time format; each `onValueChange` calls `update({ appearance: { ...values.appearance, [field]: value } })`. Labels: Default/Soft/Vivid/Mono; Compact/Standard/Comfortable; Solid/Tinted/Outline; Off/Thin/Thick; Relative/Absolute.
- [ ] **Step 2: Hosts tab**: a `SettingsCard` per `useHosts()` host, local first: `SettingsInput` "Display name" (placeholder = host label; save on blur/submit, trimmed), `SettingsSelect` "Color" (Auto + ten names), `SettingsSelect` "Icon" (six values). Writes `hostOverrides[serverId]`.
- [ ] **Step 3: Projects tab**: one `SettingsSelect` per project view key (name from `useProject` display name, sorted by `compareNames`), Auto + ten names; Auto deletes the key. `SettingsAction` "Reset all project colors" sets `projectColors: {}`.
- [ ] **Step 4: Register** in `index.client.tsx`: if `typeof client.addSettingsScreen === "function"` register the three screens, and pass `openSettings = () => client.openSettings("appearance")` into the sidebar view through a wrapper component; otherwise pass `undefined`. Collect every cleanup.
- [ ] **Step 5: All settings item**: in the display menu root, after the last separator group, render `MenuItem icon="SlidersHorizontal" label="All settings…"` only when `openSettings` is set; it closes the menu and calls it.
- [ ] **Step 6: Verify**: `npm run typecheck`, `npm test`, DOM audit; `paseo plugin reload paseo-lucid-sidebar`; open Settings → Plugins → Lucid sidebar ⚙, change each option and confirm the sidebar updates live (screenshot via `screencapture` of the Paseo window); change density while a row menu is open and confirm it stays open.
- [ ] **Step 7: Commit** `git commit -m "Add the settings page and All settings entry"`.

### Task 7: Docs and 0.4.0

**Files:**
- Modify: `OVERVIEW.md`, `OVERVIEW.zh-CN.md`, `README.md`, `README.zh-CN.md`, `package.json`, `package-lock.json`

- [ ] **Step 1:** Add one bullet to both overviews: "**Your look.** A settings page (Settings > Plugins > Lucid sidebar) sets color presets, density, tag style, guide lines and time format, and gives hosts and projects their own names, colors and icons." (Chinese equivalent). Keep the overview free of install commands and em dashes. Add the settings files to README's layout table and bump install examples to 0.4.0.
- [ ] **Step 2:** `npm pkg set version=0.4.0`, `npm install --package-lock-only`; `npm pack --dry-run --ignore-scripts` lists `client/settings/*.tsx` and `client/colors.ts`, `client/density.ts`.
- [ ] **Step 3:** Commit `Release 0.4.0`, tag `v0.4.0`, push commit and tag. The user publishes with `npm publish --access public` in their own terminal (Touch ID).
