# Lucid sidebar settings page: design

## Intent

Lucid sidebar 0.3.1 is published and its problem-solving features (host grouping, status grouping,
project tags) are done. The next release adds a **settings page with deep customization**, to:

1. make the plugin more attractive to people browsing the registry (a visible difference: color
   presets, density, styles);
2. let each user shape the sidebar to their taste instead of accepting our defaults;
3. make hosts and projects easier to tell apart, which users told us is a real problem, by letting
   them name, color and mark them.

## Goals

- A plugin settings page, opened from **Settings → Plugins → Lucid sidebar ⚙** and from a new
  **All settings…** item at the bottom of the sidebar's display menu.
- Three tabs: **Appearance**, **Hosts**, **Projects** (options below).
- Every option takes effect in the sidebar live, without reload.
- Works on desktop, web and phone (compact layout), in light and dark themes.

## Non-goals

- No new problem-solving features (no "Needs you" section, no attention highlights). The user
  ruled these out: existing grouping already covers them.
- No drag-and-drop, no manual ordering of projects or hosts.
- No sync of these settings between devices (see Constraints).
- The sidebar's display menu keeps its current quick toggles (grouping, sort, title, Show,
  filters, show background). **Anything the display menu can already do stays out of the
  settings page** (the user's rule): the settings page holds only what the display menu cannot.

## Anti-goals

- Defaults must look exactly like 0.3.1. A user who never opens the page sees no change.
- No option may break readability in either theme (no free text colors on arbitrary backgrounds).
- The settings page must not become a second, conflicting home for options already in the
  display menu.

## Constraints

- Paseo API: `client.addSettingsScreen({ id, title, icon, Component })`, one tab per registered
  screen, in registration order. Available in plugin SDK 0.16.2 and 0.17.3, so
  `requirements.paseo` stays `>=0.16.1`. UI kit: `SettingsSection`, `SettingsCard`, `SettingsRow`,
  `SettingsSwitch`, `SettingsSelect`, `SettingsInput`, `SettingsAction` from
  `@getpaseo/plugin/client/ui`. React Native primitives only; colors from the theme or our palette.
- Storage: the existing device-scoped settings document `sidebar` (`shared/preferences.ts`), so
  the sidebar and the settings page read and write one document through the existing save queue
  (`client/preferences.ts`, `client/save-queue.ts`). Device scope means per device and per plugin
  installation. A settings page opened from **Settings → Plugins** on a different host's
  installation than the one supplying the sidebar edits a different document; the **All
  settings…** item uses `client.openSettings` from the sidebar's own installation, so it always
  edits the document the sidebar reads. This is documented, not solved.
- Settings changes bump the settings `version` with a migration; new fields use schema defaults,
  so existing users keep 0.3.1's look.

## Approaches considered

- **A. Settings page for set-once appearance and identity; display menu keeps quick toggles.**
  Room for inputs and selects, everyday toggles stay one tap away. Cost: two places, mitigated by
  the **All settings…** link. **Chosen by the user.**
- B. Everything on the settings page, display menu only opens it. One home, but switching
  grouping or filters becomes slower.
- C. Everything in the inline display menu, with an Appearance submenu. No new page, but text
  input and long color lists are awkward inline, especially on phones.

## Options (decided)

### Appearance tab

| Option | Values | Default (= 0.3.1 look) | Affects |
| --- | --- | --- | --- |
| Color preset | Default, Soft, Vivid, Mono | Default | Auto colors of host headings, guide lines, project tiles and tags, label chips |
| Density | Compact, Standard, Comfortable | Standard | Row and header heights, vertical padding, gaps between project blocks and status groups |
| Tag style | Solid, Tinted, Outline | Solid (project tag), Tinted (labels) | Project tag on rows; labels keep tinted unless Outline is chosen |
| Guide lines | Off, Thin, Thick | Thin | The vertical line under host headings |
| Time format | Relative, Absolute | Relative | The trailing time on rows |

### Hosts tab

One card per configured host (`useHosts`), local host first:

- **Display name**: text; empty means the host's own label.
- **Color**: Auto or one of the palette colors.
- **Icon**: Auto (this device: monitor; others: server), Laptop, Desktop, Server, GPU, Cloud.
Showing or hiding hosts stays with the display menu's Host filter, by the rule above; the Hosts tab
has no visibility switch.

Name, color and icon apply wherever the host appears: host headings, guide lines, the display
menu's host filter.

### Projects tab

One row per project (by view key, so a project on several hosts is one entry), sorted by name:
**Color**: Auto or one of the palette colors, applied to the project tile and tag. A **Reset all
project colors** action at the bottom.

## Behaviour details (decided)

- Color choices come from a fixed set of named colors, each with fill, dark-theme text and
  light-theme text variants, like the current identity palette, so every choice stays readable in
  both themes. No free hex input.
- Presets change only the auto colors; a host's or project's explicit color wins over the preset.
- Density Standard reproduces 0.3.1 exactly, including 0.3.1's tighter project grouping.
- On touch layouts (phone, native, compact windows) rows and headers keep their minimum height
  of 44 at every density, so tap targets stay usable; density there only changes the spacing
  between groups and blocks. Row heights change with density on pointer layouts only. The
  Appearance tab says so under the Density option. (Proposed by us; the user did not object.)
- Absolute time: today as `14:32`, earlier as `Nov 8`.

- The settings screens and the **All settings…** item are registered only when the running app
  provides `addSettingsScreen` and `openSettings`; older apps simply do without them.

## Left to the builder

- Exact numbers for Compact and Comfortable density, and the Soft, Vivid and Mono palettes,
  within the constraint that text stays readable in light and dark themes.
- Lucide icon names for the host icon choices.
- How the settings are structured in code (a single `appearance` / `hosts` / `projects` section
  in the existing schema is suggested), and how existing hard-coded sizes are routed through a
  density table.
- Tests: the existing `node:test` suites cover pure modules; extend them for the migration and
  any pure color or density resolution.
