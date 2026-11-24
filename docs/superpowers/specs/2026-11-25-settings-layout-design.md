# Settings page layout: design

Revises `2026-11-24-settings-design.md` (approved 2026-11-25).

## Intent
Make the settings page work like Better Paseo's: change an option on the left and see the
sidebar change on the right, and keep the plugin's description and details on its own tab.

## Decided
- Two Paseo settings tabs: **Sidebar presentation** and **About** (Paseo's own tab bar, one
  registered screen each). The old Appearance, Hosts and Projects tabs are gone.
- Sidebar presentation, left column: Appearance (preset, density, tag style, guide lines, time
  format), then Hosts (color and icon per host), then Projects (color per project, reset all).
- Right column: a **live preview of the user's real sidebar**, so real host and project colors
  are visible. 300 wide, 560 tall, scrolls inside, sidebar-colored background, rounded border.
  Rows in the preview do not navigate and offer no row actions or menus.
- Narrow layouts and phones: preview first (420 tall), settings below.
- No widening of Paseo's 720 settings column.
- Host display names are removed: Paseo already renames hosts. Hosts keep color and icon; a
  stored name is ignored.
- About: the listing overview (kept identical to `OVERVIEW.md` by a test), then details:
  version, plugin ID, author, license, links to GitHub, the registry page
  (`https://paseo.sh/plugins/yiju-zhao/lucid-sidebar`) and npm.
- **All settings…** opens Sidebar presentation.

## Left to the builder
The width at which the columns stack; the About details layout.
