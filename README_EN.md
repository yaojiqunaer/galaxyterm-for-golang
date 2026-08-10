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
Select a saved SSH connection to browse, edit, upload, and download remote files. Binary and large files use native file dialogs and streamed transfers instead of passing through WebView text memory. Hosts, ports, usernames, and host-identity settings do not need to be re-entered, and system credentials are resolved only when an operation runs.
</details>

<details>
<summary><b>Pluggable file protocols</b></summary>
The core provides one shared file workspace while SFTP, FTP, S3, and future protocols such as WebDAV are installed as `.gtx` extensions. Extensions implement protocol and authentication adapters while reusing the same browsing, transfer, credential-reference, error, and audit experience. Protocol SDKs stay out of the base package.
</details>

<details>
<summary><b>🔀 SSH port forwarding</b></summary>
Reuse saved SSH connections for local port forwarding with password, private-key, passphrase, or SSH Agent authentication. Forwarding rules can be saved, searched, edited, duplicated, removed, and started with one click, or created directly from an SSH connection menu or detail view. A rule stores only the connection reference and forwarding endpoints, never passwords or private keys. Running, missing-connection, credential-required, and keepalive-failure states remain distinct. When no credential is stored, enter a password or private key for the current operation only. Port forwarding reuses the connection's authentication, connection timeout, SSH keepalive, and host-identity policy and never bypasses SSH verification.
</details>

<details>
<summary><b>🗂 Connection manager and system credentials</b></summary>
SSH profiles can store a 1–120 second connection timeout plus an optional keepalive interval and consecutive-failure limit. Terminals, connection tests, and port forwarding reuse these settings, while SFTP reuses the timeout. OpenSSH Config imports `ConnectTimeout`, `ServerAliveInterval`, and `ServerAliveCountMax`.
Saved connections support up to 12 reusable tags across groups. Tags participate in explicit list filtering, full-text connection search, and command-palette lookup. Select multiple connections to add, create, or remove tags in bulk without interrupting active sessions. Connection import and export preserve tags, while existing profiles remain compatible without migration.
Save non-sensitive SSH connection metadata such as name, group, host, port, username, auth type, agent socket, host-key policy, known-hosts path, and jump-host settings. New and edited connections can be saved without opening a terminal, or saved and opened immediately. In addition to passwords and private keys, macOS and Linux connections can use a running SSH Agent. A blank socket reads `SSH_AUTH_SOCK`; private keys never enter GalaxyTerm, and terminals, connection tests, SFTP, and port forwarding can reuse the Agent profile. The default accept-new policy writes the first key to GalaxyTerm's protected `known_hosts` file and rejects later changes. Strict mode permits only hosts already in the file, and a custom file can be selected. Terminals, connection tests, jump hosts, SFTP, and port forwarding reuse the same policy. Passwords, private keys, passphrases, and jump-host passwords can be stored in the system credential store; profile exports only keep credential references. The connection manager supports favorite-first sorting, group summaries, opening favorites, and opening a whole group at once. Select profiles to open, test, move, favorite, export, or delete them in bulk; use `Space` to select the focused row, `Cmd/Ctrl+A` for the current filtered results, and `Esc` to clear selection. Connection tests reuse the probe provided by SSH, extension terminals, or file protocols on demand; they neither create sessions nor write audit or recording data. The first SSH test may record a host key under the policy above. The list and detail view show latency or redacted failures for the current app run, and configuration or credential changes clear stale results. Bulk deletion summarizes its impact on profiles, saved credentials, and active sessions; deleting profiles does not close sessions that are already open. Group menus create connections in place, rename groups, or safely remove a group, while connection menus move a profile into an existing or new group. Renaming to an existing group merges it; removing a group only moves profiles to Ungrouped and never deletes connection settings, credentials, or active sessions. It can also select and preview an OpenSSH Config file before importing profiles in bulk. `IdentityAgent` imports as Agent authentication, while an explicit `IdentityFile` keeps precedence. When a profile already has an active session, the primary action focuses it while keeping an explicit new-terminal action available. Use the arrow keys to focus a profile, `Enter` to open or focus it, and `Shift+Enter` to start another connection. While a connection is being prepared, the list, detail view, and sidebar share one loading state. Repeated clicks for the same profile are coalesced while other profiles can still open in parallel. Sidebar quick connections are keyboard accessible and expose edit, duplicate, favorite, new, and delete actions from either the row menu or the context menu.
</details>

<details>
<summary><b>Unified command palette</b></summary>
Command history is isolated by terminal type, session, and command, so identical commands in different sessions no longer replace each other. Individual entries can be removed, and Security settings can pause local history or retain between 20 and 500 commands. These controls do not change audit or recording behavior.
Search connections, active sessions, terminal types, quick commands, and workspace pages from one command palette. Recently completed actions appear first; only action identifiers are stored, never command text, connection credentials, or session data. Navigate results with the arrow keys, `Home`, `End`, `Enter`, and `Esc`. The active keyboard result stays in view, while unavailable actions remain visible with an explanation of the missing prerequisite. A unified Command Center switches between Quick Commands and Command History with tabs, while existing shortcuts and menus still open the intended tab directly; both views show the current target and readiness. Quick commands filter by current terminal type, all commands, or favorites, while history filters by provider, session, or all records. Commands can run against a connected, idle terminal, while single-line commands can be inserted for review and editing before execution. Multiline commands are never presented as a safe insert, and create or edit forms expand only when needed. Every entry point shares the same sensitive-command gate, so legacy commands containing passwords, tokens, private-key paths, or bearer credentials cannot be sent from either the Command Center or command palette.
</details>

<details>
<summary><b>🧾 Audit logs and terminal recordings</b></summary>
Records session open, reconnect, close, error, clear, quick command, and large paste events. Terminal output is stored as asciinema v2 text recordings. The Audit page uses a read-only xterm renderer to restore ANSI colors, carriage-return updates, screen clearing, and cursor movement at the original timestamps. Playback supports pause, restart, seeking, event stepping, speed control, and `.cast` or `.log` export. Active sessions can save a snapshot at any time; saving the same connection segment again updates its existing record. Closing a session, reconnecting, or exiting the app finalizes the complete recording, while output after reconnect is retained as a new connection segment under the same session. When local audit storage is full, GalaxyTerm removes the oldest records first. If the new recording still cannot be stored, existing history is preserved, the failure is shown explicitly, and session closing continues.
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
<summary><b>Multi-session commands</b></summary>
Send one command to several terminals from the session toolbar or session menu. Targets are limited to connected, idle sessions; only the current session is selected initially, and the user must explicitly choose at least two targets. Busy, connecting, failed, and closed sessions are excluded automatically. Multi-session send accepts a single command line and blocks common password, token, and private-key content. Every successful target still records its own command history, audit event, and terminal recording, while partial failures are never retried against successful sessions automatically.
</details>

<details>
<summary><b>Terminal output search</b></summary>
Typing a query highlights matches immediately and shows the active position and total count. Match case, whole word, and regular-expression modes are available, while invalid expressions are reported without interrupting the terminal. Press `Enter` for the next match, `Shift+Enter` for the previous match, or `Esc` to clear search and return focus to the terminal. The active query is reapplied when switching sessions, new output refreshes matches automatically, and results remain isolated per session. A compact control returns a scrolled terminal to the latest output. HTTP(S) links require a `Cmd`-click or `Ctrl`-click before GalaxyTerm opens them in the system browser, preventing accidental activation and unsafe schemes.
</details>

<details>
<summary><b>Multi-session protection and workspace continuity</b></summary>
The tab context menu can close sessions to either side of the current tab. Protected sessions remain open, while every other session saves its audit record before closing.
Protect individual terminal tabs to show a lock indicator, hide the tab close button, and keep them open when closing all, other, or disconnected sessions. Protection is saved and restored with workspace snapshots. Restore matches already-open sessions by count and only creates missing tabs, so repeating it does not keep appending duplicates. Remote sessions created from saved connections can be rebuilt safely through the system credential store; temporary remote sessions, missing providers, and unavailable credentials are reported as skipped. Closing the final tab clears the auto-saved snapshot so the next launch does not reopen sessions the user intentionally closed. Navigating among Connections, Files, Audit, and Settings keeps terminal instances mounted; a session ends only when its tab is explicitly closed. `Ctrl+Tab` opens a focus-preserving most-recently-used switcher: press again to cycle, release `Ctrl` to confirm, or press `Esc` to cancel. It shows the session name, connection target, runtime state, and unread activity together. The session sidebar always keeps the same stable order as the tab bar, including failed and closed tabs. When several sessions are open or any needs attention, filter All, Active, or Issues and continue searching by name, provider, host, user, or directory. Row and context menus rename, protect, reconnect, copy, move, or close a session; drag reordering pauses while filtered so hidden rows cannot make the resulting order ambiguous. Every reconnect entry point shares immediate progress and duplicate protection: one session starts only one reconnect until it settles, and late status events from its old connection segment cannot overwrite the current terminal. When failed or closed tabs exist, the session toolbar, global session menu, and command palette provide one batch reconnect action. It restores targets in tab order, reports once for the batch, and preserves the current page, active tab, and terminal focus. Security settings can enable automatic recovery for saved remote connections after unexpected errors, with configurable initial delay and maximum attempts followed by exponential backoff capped at 30 seconds. Normal exits, local terminals, and temporary connections never trigger it. The terminal status rail shows the countdown, attempt, cancellation, and exhausted states, while background recovery never changes the active tab or page. Every attempt finalizes the preceding audit and recording segment and records a new automatic-reconnect event. Duplicate session names receive stable display ordinals across tabs, the sidebar, window title, and command palette. A safe copy-target action exposes only `user@host:port` or the local working directory from the session toolbar, menus, and command palette; credentials never enter the clipboard. Local terminals without an explicit directory start in the user's home directory and expose `~` as their copyable session target.
</details>

## Architecture

The core contains the local terminal, SSH, session management, shared file workspace, credentials, and extension host. Terminal and file-protocol extensions declare `providers` and `fileProviders` separately and can be installed online from GitHub Releases or offline from `.gtx` packages. Extension management searches by name, provider, capability, and status; saved connections with a missing provider lead directly to its install or enable path, while disable and uninstall actions show affected connections and active sessions first. Every active terminal identifies whether its provider comes from the core or an extension. Existing sessions remain open when an extension is disabled or removed, while the status rail explains whether new sessions are available and links extension-backed sessions directly to management. Audit and recording indicators also open the current session record. File providers advertise capabilities such as `list`, `read`, `write`, `upload`, `download`, `mkdir`, `rename`, and `delete`, then contribute connection forms through `configFields` and `authFields`. File locations can be saved in the shared connection manager; authentication fields go to the system credential store and are omitted from profile storage and exports. The workspace does not need protocol-specific UI code and only exposes fields and operations supported by the active provider.

See [Extension Distribution](docs/extensions_EN.md) for extension sources, `galaxyterm-index.json`, and the GitHub Release format.

Interactive terminal extensions run as one controlled sidecar process per session. Installing or removing one refreshes available providers immediately without restarting the app or interrupting existing sessions. Extensions can also ship namespace-isolated dictionaries in their `.gtx` packages; language and extension changes take effect immediately. The extension guide defines dictionary constraints, protocol frames, timeouts, and process lifecycle rules.

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
