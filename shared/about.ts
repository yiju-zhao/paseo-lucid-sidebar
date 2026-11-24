/**
 * What the settings page's About tab shows. `OVERVIEW` is the listing overview, kept identical to
 * OVERVIEW.md, and `VERSION` matches package.json; tests/about.test.ts checks both, so update
 * them together when either file changes.
 */
export const VERSION = "0.4.0";

export const OVERVIEW =
  "A workspace sidebar for running Paseo on several hosts. It looks and sorts like the built-in list, but keeps each host's projects and workspaces together under its own heading.\n\nChoose **Lucid sidebar** under Settings > Sidebar > Sidebar view; choose the default view to switch back. Requires Paseo 0.16.1 or later.\n\n- **Hosts together.** Each host gets a foldable heading with a guide line in its color, this device's host first. Turn it off with Show > Host.\n- **Project tags.** Every row names its project in the project's color. Projects with no workspaces stay hidden.\n- **Fold all.** One button folds or unfolds every host, project and status group.\n- **Your look.** A settings page (Settings > Plugins > Lucid sidebar, or All settings in the sidebar menu) sets color presets, density, tag style, guide lines and time format, a color and icon for each host, and a color for each project, with a live preview of your sidebar beside the options.\n- Everything else works like the built-in list: grouping by project or status, pinned workspaces, the display menu and row actions.\n\nThe plugin reads workspace data from your connected hosts and asks the local daemon which host is this device. Nothing leaves your machines. Display preferences are stored on this device.\n\nRows cannot be dragged, project icons show as colored initials, and Cmd or Ctrl plus a number follows the built-in list's order.\n";

export const LINKS = {
  github: "https://github.com/yiju-zhao/paseo-lucid-sidebar",
  registry: "https://paseo.sh/plugins/yiju-zhao/lucid-sidebar",
  npm: "https://www.npmjs.com/package/paseo-lucid-sidebar",
};
