Replaces the content of the Paseo sidebar with a rebuilt copy of the built-in workspace list. It is meant as a starting point for a customized sidebar: it looks and sorts like the default list, and its code is organized so the row content and ordering can be changed.

Paseo does not switch to this view when the plugin is installed. Choose **Workspace sidebar** under Settings > Sidebar > Sidebar view. Choosing the default view again restores the built-in list.

Requires Paseo 0.16.1 or later on the app and on the daemon the plugin is installed on, with plugins enabled on that daemon. The plugin only has client code and shows workspaces from every connected host.

## What it shows

- A Pinned section, then workspaces grouped by project or by status, as in the built-in list. Projects are sorted by name; workspaces by creation time or last prompt. Each group shows 7 rows plus any that are not done, with Show more for the rest.
- Rows with the status indicator, the title or branch name, and the time since the last status change or the diff stats. The second line starts with the project, as a bold chip in the same color as its tile, except under a project header, and can then show the branch, host, pull request, checks, running service and labels.
- Hosts stay together, the local host first. In project grouping, projects are listed under a heading for each host, and a project on several hosts appears under each of them. In the Pinned section and status groups, a host's workspaces sit together under a small heading when a section spans several hosts. Press a host heading to fold or unfold it; a folded host shows how many projects or workspaces it holds. Turn this off with Keep hosts together in the display menu to merge projects across hosts like the built-in list.
- The display menu in the Workspaces header: grouping, sort, title, shown items, host, project and label filters, and background workspaces.
- Row actions: copy path or branch name, rename, pin, labels and archive. Worktrees ask for confirmation before archiving.

To read pull requests, checks and services, the plugin opens one workspace subscription per connected host. It also asks the daemon at 127.0.0.1:6767 for its server id to recognize the local host, whose host badge is hidden.

## Known limits

- Rows and projects cannot be dragged, so manual ordering is not available.
- Project icons are not available to plugins; every project shows its colored initial.
- Label and host colors are derived from their names and may differ from the colors set in Paseo.
- Display preferences are stored on this device and start from the built-in defaults; they are separate from the built-in sidebar's preferences.
- Cmd or Ctrl plus a number still follows the built-in list's order. There is no hover card, Mark as read, or undo after archiving.
