A workspace sidebar for people who run Paseo on more than one host. It keeps the look and sorting of the built-in workspace list, and groups each host's projects and workspaces together under a heading you can fold.

## Setup

Paseo does not switch to this view when the plugin is installed. Choose **Workspace sidebar** under Settings > Sidebar > Sidebar view. Choosing the default view again restores the built-in list.

Requires Paseo 0.16.1 or later on the app and on the daemon the plugin is installed on, with plugins enabled on that daemon. The plugin only has client code and shows workspaces from every connected host. With a single host it looks like the built-in list.

## What it shows

- **Hosts kept together.** In project grouping, each host gets a heading with its projects below it, this device's host first and the rest by name. A project that lives on several hosts appears under each of them, with only that host's workspaces. Projects with no workspace to list, such as unused ones, stay hidden. In the Pinned section and in status groups, a host's workspaces sit together under a smaller heading.
- **Foldable hosts with guide lines.** Press a host heading to fold or unfold it; a folded host shows how many projects or workspaces it holds. A thin line in the host's color runs down the side of everything that belongs to it.
- **Project tags.** The second line of a row starts with the project name, as a bold tag in the same color as the project's tile. Rows under a project header leave it out, since the header already names the project. Project names in headers are bold.
- **Everything the built-in list shows.** Pinned workspaces, grouping by project or status, sorting by creation time or last prompt, the 7 row "Show more" rule, status indicators, the time since the last status change or diff stats, branch, pull request, checks, running services and labels.
- **The built-in display menu** in the Workspaces header: grouping, sort, title, shown items, host, project and label filters, background workspaces, and Keep hosts together. Turning Keep hosts together off merges projects across hosts like the built-in list.
- **Row actions.** Hover a row for archive and more buttons, or use the more button on touch devices: copy path or branch name, rename, pin, labels and archive. Archiving a worktree asks for confirmation first.

## Data and storage

To show pull requests, checks and services, the plugin opens one workspace subscription to each connected host. To recognize this device's host, it asks the daemon at 127.0.0.1:6767 for its server id; a daemon on another port, and every host on a phone, counts as remote. Nothing is sent anywhere else.

Display preferences and folded sections are stored on this device. They start from the defaults above, are separate from the built-in sidebar's preferences, and are not synced to other devices.

## Known limits

- Rows and projects cannot be dragged, so there is no manual ordering.
- Project icons are not available to plugins; projects show a colored initial instead.
- Label and host colors are derived from their names and may differ from the colors set in Paseo.
- Cmd or Ctrl plus a number still follows the built-in list's order.
- There is no hover card, Mark as read, or undo after archiving.
