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
Provide secure and reliable remote file access
</details>

<details>
<summary><b>🧾 Audit logs and terminal recordings</b></summary>
Records session open, reconnect, close, error, clear, quick command, and large paste events. Terminal output is stored as asciinema v2 text recordings, which can be played, paused, restarted, and exported as `.cast` or `.log` from the Audit page.
</details>

<details>
<summary><b>🔐 Sensitive data redaction</b></summary>
Audit and recording exports redact common passwords, tokens, Authorization headers, and private key blocks. GalaxyTerm does not record every raw keystroke by default; it records operation summaries and terminal output recordings.
</details>

## Architecture

----

## Installation

### Local start

```shell
CGO_LDFLAGS='-framework UniformTypeIdentifiers' go run -tags dev .
```
