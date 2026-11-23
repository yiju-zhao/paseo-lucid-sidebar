Groups the sidebar by host. Each connected host is a section with its connection status. Each host lists its workspaces directly, with the project shown as a tag on each row. Pinned workspaces and pinned projects sit in their own section above the hosts.

Paseo does not switch to this view when the plugin is installed. Choose it under Settings > Sidebar > Sidebar view. Switching back to the default view restores the built-in sidebar, and the sidebar header and footer are the same in both.

Requires Paseo 0.16.0-beta.1 or later on the app and on the daemon the plugin is installed on, with plugins enabled on that daemon. The plugin is client only and covers every host the app is connected to, so it does not have to be installed on each host.

Rows use two lines: a status dot and the workspace name, then a project tag on the left and the branch and status on the right. Tags include a solid-color rounded avatar with a white initial. Its color stays the same across sorting, filtering, pinned sections and restarts. Long project names truncate to leave room for the branch and status. Line changes or the time since the last activity sit beside the workspace name.

The toolbar at the top of the view has:

- Sort: created time, recent activity, name, or priority. Priority puts workspaces that need input, failed or need attention first, then running ones.
- Filter by status (all, active, or waiting on you), by host, and by label.
- Display: show the title or the branch as the row name, and line changes or time on the right.

Hosts show a computer icon for the daemon running on this device and a server icon otherwise. The plugin finds the local daemon by asking 127.0.0.1:6767 for its server id, so a local daemon on another port shows the server icon, and on phones every host does. Press a host to collapse it. Press a workspace to open it. Long press a row, or press its more button, to pin, rename or archive the workspace, start a new workspace in the same project, or pin the project. Project pins are stored on this device.

Pinning a project moves all of its workspaces, pinned or not, into the pinned section as one group, and takes them out of the host lists. The group is a card in the project's color with a header that shows the project's avatar and name, the host when more than one is shown, and the workspace count. Rows inside the group leave out the project tag. Press the header to collapse the group and the pin button to unpin it. Project groups come first in the pinned section, in the order they were pinned, followed by individually pinned workspaces grouped by host. A pinned project whose workspaces are all filtered out is not shown.

Sort, filter, display and collapsed state are stored on this device and are not synced to other devices. They are separate from the built-in sidebar's display preferences. Background and archiving workspaces are hidden, and hosts with no workspaces to show, including offline hosts, are left out.

Known limits: rows cannot be dragged, so there is no manual ordering. Project icons from the built-in sidebar are not shown.
