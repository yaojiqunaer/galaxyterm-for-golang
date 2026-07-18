# galaxyterm-for-golang

Star River Terminal golang language

The project is based on CharGPT 4o-mini - the star River symbolizes vastness and immensity, implying endless
possibilities and wide compatibility of the terminal.

----

## Introduction

> English | [Chinese](README.md)

slightly

## Features

<details>
<summary><b>🕸 ssh connection to a remote terminal </b></summary>
Provides secure and reliable remote ssh access
</details>

<details>
<summary><b>🔗 Remote file access </b></summary>
Select a saved SSH connection to browse, edit, upload, and download remote files. Binary and large files use native file dialogs and streamed transfers instead of passing through WebView text memory. Hosts, ports, and usernames do not need to be re-entered, and system credentials are resolved only when an operation runs.
</details>

<details>
<summary><b>Pluggable file protocols</b></summary>
The core provides one shared file workspace while SFTP, FTP, S3, and future protocols such as WebDAV are installed as `.gtx` extensions. Extensions implement protocol and authentication adapters while reusing the same browsing, transfer, credential-reference, error, and audit experience. Protocol SDKs stay out of the base package.
</details>

<details>
<summary><b>🔀 SSH port forwarding</b></summary>
Reuse saved SSH connections for local port forwarding with password, private-key, and passphrase authentication. When no credential is stored, enter a password or private key for the current operation only.
</details>

<details>
<summary><b>🗂 Connection manager and system credentials</b></summary>
Save non-sensitive SSH connection metadata such as name, group, host, port, username, auth type, and jump-host settings. New and edited connections can be saved without opening a terminal, or saved and opened immediately. Passwords, private keys, passphrases, and jump-host passwords can be stored in the system credential store; profile exports only keep credential references. The connection manager supports favorite-first sorting, group summaries, opening favorites, and opening a whole group at once. Group menus create connections in place, rename groups, or safely remove a group, while connection menus move a profile into an existing or new group. Renaming to an existing group merges it; removing a group only moves profiles to Ungrouped and never deletes connection settings, credentials, or active sessions. It can also select and preview an OpenSSH Config file before importing profiles in bulk. When a profile already has an active session, the primary action focuses it while keeping an explicit new-terminal action available. Use the arrow keys to select a profile, `Enter` to open or focus it, and `Shift+Enter` to start another connection. Sidebar quick connections are keyboard accessible and expose edit, duplicate, favorite, new, and delete actions from either the row menu or the context menu.
</details>

<details>
<summary><b>Unified command palette</b></summary>
Search connections, active sessions, terminal types, quick commands, and workspace pages from one command palette. Recently completed actions appear first; only action identifiers are stored, never command text, connection credentials, or session data. Navigate results with the arrow keys, `Home`, `End`, `Enter`, and `Esc`. The active keyboard result stays in view, while unavailable actions remain visible with an explanation of the missing prerequisite.
</details>

<details>
<summary><b>🧾 Audit logs and terminal recordings</b></summary>
Records session open, reconnect, close, error, clear, quick command, and large paste events. Terminal output is stored as asciinema v2 text recordings. The Audit page uses a read-only xterm renderer to restore ANSI colors, carriage-return updates, screen clearing, and cursor movement at the original timestamps. Playback supports pause, restart, seeking, event stepping, speed control, and `.cast` or `.log` export. When local audit storage is full, GalaxyTerm removes the oldest records first. If the new recording still cannot be stored, existing history is preserved, the failure is shown explicitly, and session closing continues.
</details>

<details>
<summary><b>🔐 Sensitive data redaction</b></summary>
Saved and exported audit records and recordings redact common passwords, tokens, Authorization headers, and private key blocks. Legacy records are also sanitized on load, including recording metadata and event payloads. GalaxyTerm does not record every raw keystroke by default; it records operation summaries and terminal output recordings.
</details>

<details>
<summary><b>⏱ Command status and interruption</b></summary>
Interactive terminals show the current command, live duration, and execution state. Running commands can receive a standard PTY interrupt from the toolbar, terminal status bar, or `Ctrl+C`. A real exit code is shown when the shell exposes OSC 133 integration, while common shell, PowerShell, MySQL, Redis, and PostgreSQL prompts are recognized as command completion.
</details>

<details>
<summary><b>Terminal output search</b></summary>
Typing a query highlights matches immediately and shows the active position and total count, with explicit no-match feedback. Press `Enter` for the next match, `Shift+Enter` for the previous match, or `Esc` to clear search and return focus to the terminal. The active query is reapplied when switching sessions, new output refreshes matches automatically, and results remain isolated per session.
</details>

<details>
<summary><b>Multi-session protection and workspace continuity</b></summary>
Protect individual terminal tabs to show a lock indicator, hide the tab close button, and keep them open when closing all, other, or disconnected sessions. Protection is saved and restored with workspace snapshots. Restore matches already-open sessions by count and only creates missing tabs, so repeating it does not keep appending duplicates. Remote sessions created from saved connections can be rebuilt safely through the system credential store; temporary remote sessions, missing providers, and unavailable credentials are reported as skipped. Closing the final tab clears the auto-saved snapshot so the next launch does not reopen sessions the user intentionally closed. Navigating among Connections, Files, Audit, and Settings keeps terminal instances mounted; a session ends only when its tab is explicitly closed. The active-session sidebar keeps the same stable order as the tabs. When several sessions are open, search by name, provider, host, user, or directory, then use the row action button or context menu to rename, protect, reconnect, copy, move, or close a session. Duplicate session names receive stable display ordinals across tabs, the sidebar, window title, and command palette. A safe copy-target action exposes only `user@host:port` or the local working directory from the session toolbar, menus, and command palette; credentials never enter the clipboard. Local terminals without an explicit directory start in the user's home directory and expose `~` as their copyable session target.
</details>

## Architecture

The core contains the local terminal, SSH, session management, shared file workspace, credentials, and extension host. Terminal and file-protocol extensions declare `providers` and `fileProviders` separately and can be installed online from GitHub Releases or offline from `.gtx` packages. Extension management searches by name, provider, capability, and status; saved connections with a missing provider lead directly to its install or enable path, while disable and uninstall actions show affected connections and active sessions first. File providers advertise capabilities such as `list`, `read`, `write`, `upload`, `download`, `mkdir`, `rename`, and `delete`, then contribute connection forms through `configFields` and `authFields`. File locations can be saved in the shared connection manager; authentication fields go to the system credential store and are omitted from profile storage and exports. The workspace does not need protocol-specific UI code and only exposes fields and operations supported by the active provider.

See [Extension Distribution](docs/extensions_EN.md) for extension sources, `galaxyterm-index.json`, and the GitHub Release format.

----

## Installation

### File protocol extensions

The base application does not include SFTP, FTP, or S3 SDKs. Build the official SFTP provider as a standalone offline `.gtx` package:

```shell
./scripts/package-extension.sh sftp
```

The package is written to `dist/extensions/`. Install it from Extensions > Offline Install; the Files workspace discovers SFTP automatically and only shows browse, edit, upload, rename, or delete actions declared by the provider. FTP/FTPS and S3 extensions use the same `stdio-json-v1` file-provider protocol without changing the core file workspace.

Run `./scripts/generate-extension-index.sh` before publishing a GitHub Release to generate the online-install catalog for all platform packages.

### Local start

```shell
CGO_LDFLAGS='-framework UniformTypeIdentifiers' go run -tags dev .
```
