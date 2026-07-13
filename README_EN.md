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
Select a saved SSH connection to browse, edit, upload, and download remote files without re-entering the host, port, or username. System credentials are resolved only when an operation runs.
</details>

<details>
<summary><b>🔀 SSH port forwarding</b></summary>
Reuse saved SSH connections for local port forwarding with password, private-key, and passphrase authentication. When no credential is stored, enter a password or private key for the current operation only.
</details>

<details>
<summary><b>🗂 Connection manager and system credentials</b></summary>
Save non-sensitive SSH connection metadata such as name, group, host, port, username, auth type, and jump-host settings. New and edited connections can be saved without opening a terminal, or saved and opened immediately. Passwords, private keys, passphrases, and jump-host passwords can be stored in the system credential store; profile exports only keep credential references. The connection manager supports favorite-first sorting, group summaries, opening favorites, and opening a whole group at once.
</details>

<details>
<summary><b>🧾 Audit logs and terminal recordings</b></summary>
Records session open, reconnect, close, error, clear, quick command, and large paste events. Terminal output is stored as asciinema v2 text recordings. The Audit page uses a read-only xterm renderer to restore ANSI colors, carriage-return updates, screen clearing, and cursor movement at the original timestamps. Playback supports pause, restart, seeking, event stepping, speed control, and `.cast` or `.log` export.
</details>

<details>
<summary><b>🔐 Sensitive data redaction</b></summary>
Saved and exported audit records and recordings redact common passwords, tokens, Authorization headers, and private key blocks. Legacy records are also sanitized on load, including recording metadata and event payloads. GalaxyTerm does not record every raw keystroke by default; it records operation summaries and terminal output recordings.
</details>

<details>
<summary><b>⏱ Command status and interruption</b></summary>
Interactive terminals show the current command, live duration, and execution state. Running commands can receive a standard PTY interrupt from the toolbar, terminal status bar, or `Ctrl+C`. A real exit code is shown when the shell exposes OSC 133 integration, while common shell, PowerShell, MySQL, Redis, and PostgreSQL prompts are recognized as command completion.
</details>

## Architecture

----

## Installation

### Local start

```shell
CGO_LDFLAGS='-framework UniformTypeIdentifiers' go run -tags dev .
```
