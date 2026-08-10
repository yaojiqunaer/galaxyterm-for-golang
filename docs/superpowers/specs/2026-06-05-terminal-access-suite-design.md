# GalaxyTerm Terminal Access Suite Design

## Goal

GalaxyTerm should become a small, extensible terminal access desktop app. The core application stays lightweight and stable, while heavier terminal types and remote file protocols are delivered as optional extensions.

The first architectural target is not to implement every provider at once. The target is to create a clean terminal session kernel, a provider registry, and an extension model that can support many terminal types without duplicating frontend or backend lifecycle code.

## Confirmed Decisions

- The app will use Go-native SDKs, APIs, or protocols for provider implementations.
- The app will not rely on local CLI tools such as `kubectl`, `docker`, `mysql`, or `redis-cli` as the core implementation.
- The core app includes the local shell, SSH terminal, shared remote-file workspace, credential references, audit, and extension host.
- Kubernetes, Docker, databases, message systems, and remote-file protocols are official extensions.
- SFTP, FTP, S3, WebDAV, and future storage protocols must use the same file-provider contract instead of adding protocol SDKs to the core binary.
- Official extensions can be hosted in a personal GitHub organization or repository and distributed through GitHub Releases.
- Offline installation will be supported by downloading extension package files from GitHub Releases and importing them locally.
- The app and documentation must support multiple languages. Chinese and English are required first, and the design must allow additional languages later.

## Architecture

The core app exposes one terminal session API to the frontend:

```text
CreateSession(request) -> sessionId
Send(sessionId, data)
Resize(sessionId, cols, rows)
Close(sessionId)
ListProviders() -> provider metadata
ListSessions() -> active sessions
```

Runtime events are scoped by session:

```text
terminal:data:{sessionId}
terminal:error:{sessionId}
terminal:exit:{sessionId}
terminal:status:{sessionId}
```

The frontend never calls provider-specific APIs. It creates a session with a provider type and connection config, then treats every session as an xterm.js terminal.

## Core Backend Components

### SessionManager

`SessionManager` owns all live sessions. It is responsible for:

- Creating sessions from provider requests
- Generating and tracking session IDs
- Routing input, resize, and close calls
- Emitting session-scoped events
- Cleaning up sessions on close, exit, error, or app shutdown
- Protecting internal maps with a mutex

Session operations should be idempotent where practical. Closing an already closed session should not panic.

### TerminalSession

Each live terminal session wraps a provider driver and common metadata:

```text
ID
ProviderType
DisplayName
CreatedAt
Status
Driver
```

The session object should keep common lifecycle behavior outside provider implementations.

### ProviderRegistry

`ProviderRegistry` stores built-in and installed extension providers. It supports:

- Registering built-in providers at startup
- Loading installed extension manifests
- Returning provider metadata for frontend forms
- Creating provider drivers from typed config

Provider metadata includes:

```text
type
name
description
version
category
capabilities
config schema
auth schema
install source
```

## Driver Model

The provider implementation model has two driver families.

### StreamDriver

Used when the backend has a real byte stream:

- Local shell
- SSH terminal
- Kubernetes pod exec
- Docker container exec
- Serial terminal
- Telnet

The driver handles stdin, stdout, stderr, resize, and close.

### ReplDriver

Used when the backend protocol is request/response but should feel interactive:

- MySQL
- Redis
- PostgreSQL
- MongoDB
- ClickHouse
- Kafka management or consume sessions

The REPL layer handles prompt rendering, input buffering, command parsing, execution, result formatting, command history, and connection state messages. The frontend still sees normal terminal output.

## Built-In Providers

### Local Shell

Local shell remains a stream provider backed by a PTY. It must support multiple concurrent sessions and must not share fixed event names.

### SSH

SSH is a stream provider implemented with `golang.org/x/crypto/ssh`.

Current implementation:

- Password authentication
- Private-key and passphrase authentication
- SSH Agent authentication on macOS/Linux through `SSH_AUTH_SOCK` or a connection-specific socket; Agent connections are released after the SSH handshake
- Per-profile SSH connection timeout and optional keepalive interval/failure threshold, shared by terminals, connection probes, and port forwarding; SFTP reuses the connection timeout
- Credential-free saved port-forwarding rules reference SSH profiles and support search, edit, duplicate, delete, direct launch, and explicit missing-profile/credential-required/runtime states
- Session-scoped shell
- Resize support
- Clean close
- Jump-host routing
- Shared host-key verification for terminals, connection tests, jump hosts, SFTP, and port forwarding
- `accept-new` policy that persists the first key and rejects changed keys
- `strict` policy that only accepts keys already present in the selected known-hosts file
- A protected application known-hosts file by default, with an optional custom path

### Remote File Workspace

The core owns one protocol-neutral remote-file workspace. It renders navigation, transfer progress, conflict handling, errors, credential selection, and audit events without importing a protocol SDK.

Installed extensions contribute file providers such as SFTP, FTP, S3, or WebDAV. SFTP reuses the SSH connection profile, credential reference or SSH Agent, host-key policy, and known-hosts path, while object stores expose buckets and prefixes through the same navigation model.

## Official Extensions

Official extensions are maintained outside the core app repository or in sibling repositories. Suggested names:

```text
galaxyterm-extension-kubernetes
galaxyterm-extension-docker
galaxyterm-extension-mysql
galaxyterm-extension-redis
galaxyterm-extension-postgres
galaxyterm-extension-mongodb
galaxyterm-extension-clickhouse
galaxyterm-extension-kafka
galaxyterm-extension-sftp
galaxyterm-extension-ftp
galaxyterm-extension-s3
```

Initial official extension targets:

- Kubernetes pod terminal through `client-go`
- Docker container terminal through Docker Engine API
- MySQL interactive REPL through Go MySQL protocol libraries
- Redis interactive REPL through Go Redis protocol libraries
- SFTP file access through the shared file-provider contract
- FTP and FTPS file access through the shared file-provider contract
- S3-compatible object storage through the shared file-provider contract

Future terminal types:

- PostgreSQL
- MongoDB
- ClickHouse
- Elasticsearch query terminal
- Kafka produce, consume, and admin terminal
- RabbitMQ or NATS terminal
- Serial port terminal
- Telnet terminal
- WebSocket raw terminal
- AWS SSM Session Manager
- AWS ECS Exec
- Cloud provider shell integrations
- containerd or CRI-O pod/container exec

## Extension Packaging

Go's native `.so` plugin mechanism is not a good fit for cross-platform desktop distribution. GalaxyTerm extensions should use a sidecar process model for runtime installation.

An extension package contains:

```text
manifest.json
bin/{darwin,linux,windows}/{arch}/extension executable
i18n/{locale}.json
docs/{locale}/README.md, optional
README.md
LICENSE
checksums.txt
signature file, optional at first
```

The package file can be a compressed archive:

```text
galaxyterm-extension-mysql_0.1.0_darwin_arm64.gtx
galaxyterm-extension-mysql_0.1.0_linux_amd64.gtx
galaxyterm-extension-mysql_0.1.0_windows_amd64.gtx
```

The `.gtx` extension can be treated as a normal zip or tar archive with a GalaxyTerm-specific suffix.

An extension can contribute terminal providers, file providers, or both. Existing terminal-only manifests remain valid. A file-only extension declares its protocol without appearing in the terminal provider selector:

```json
{
  "id": "galaxyterm-extension-s3",
  "name": "S3",
  "version": "0.1.0",
  "apiVersion": "v1",
  "fileProviders": [
    {
      "type": "s3",
      "protocol": "s3",
      "nameKey": "extension.s3.name",
      "capabilities": ["list", "stat", "read", "write", "upload", "download", "mkdir", "rename", "delete"],
      "authMethods": ["accessKey", "credentialProcess"]
    }
  ]
}
```

## Extension Distribution

The core app should support two installation paths:

### Online Install

- User adds or selects an official GitHub source.
- The app reads a release index from GitHub Releases.
- The app downloads the matching OS and architecture package.
- The app verifies checksum.
- The app installs the package into the user extension directory.

### Offline Install

- User downloads a `.gtx` package from GitHub Releases on any machine.
- User imports the package in GalaxyTerm.
- The app verifies manifest, checksum, OS, architecture, and extension API version.
- The app installs the package without network access.

The default official source can be a personal GitHub repository or organization, for example:

```text
github.com/<owner>/galaxyterm-extensions
```

The exact owner is configurable and should not be hard-coded into the provider protocol.

## Extension Host Protocol

Extensions run as child processes. The core app communicates with them through a small protocol over stdio in the first version. gRPC over a local socket can be added later if needed.

Required extension operations:

```text
Handshake
GetManifest
CreateSession
Send
Resize
Close
Shutdown
```

Required event messages from extension to core:

```text
Data
Error
Exit
Status
ProviderLog
```

File providers use request/response operations over the same authenticated sidecar channel:

```text
OpenFileConnection
List
Stat
Read
Write
Mkdir
Rename
Delete
CloseFileConnection
```

Capabilities are negotiated per provider. The workspace hides unsupported commands and treats object-store prefixes as virtual directories. Upload and download payloads use bounded streaming rather than loading whole files into the webview or one protocol message.

The protocol must include:

- Extension API version
- Provider type
- Session ID
- Request ID for command responses
- Structured errors

The core app owns the user-facing session ID. Extensions can keep their own internal IDs but must route through the core session ID.

## Frontend Design

The frontend should replace separate terminal components with one reusable `TerminalPane`.

Responsibilities:

- Create xterm.js instance
- Bind to session-scoped events
- Send user input through the unified session API
- Resize through the unified session API
- Close backend session when the tab closes
- Render terminal status and errors inside the terminal

The new terminal modal should be metadata driven:

- Provider selector
- Dynamic config form from provider schema
- Auth fields from auth schema
- Display name field

The first UI can support a practical subset of schema types:

- string
- password
- number
- boolean
- select
- textarea

## Internationalization

GalaxyTerm must treat user-facing text as localizable from the start. This applies to the core app, built-in providers, extension metadata, errors, and documentation.

### Application UI

The frontend should use a small i18n layer instead of hard-coded display strings. The first required locales are:

```text
zh-CN
en-US
```

The app should select a locale in this order:

1. User setting
2. Operating system language
3. `en-US` fallback

The first implementation should keep translations in static locale files, for example:

```text
frontend/src/locales/zh-CN.json
frontend/src/locales/en-US.json
```

UI code should reference stable translation keys, not raw Chinese or English strings. Provider metadata exposed to the frontend should also be localizable.

Current connection and command UX:

- Saved terminal and file profiles support normalized, reusable tags. Tags survive non-secret import/export, participate in group-independent filtering, full-text search, and command-palette lookup, and can be added or removed across a multi-selection without affecting active sessions.
- Local command history is keyed by provider, session, and command. Sensitive commands are rejected before storage, individual entries can be removed, recording can be paused, and retention is configurable from 20 to 500 entries.
- Command-history privacy settings do not disable or bypass session audit events or terminal recordings.
- Automatic recovery is opt-in and applies only to saved, non-local terminal profiles after unexpected errors. Retry delay and maximum attempts are bounded, repeated error events cannot create duplicate timers, ordinary exits never retry, and background recovery never changes the active workspace or tab. Each attempt closes the preceding audit and recording segment before creating the next one.
- Explicit batch recovery includes only failed or closed sessions that are not already reconnecting. It preserves tab order and the active workspace context, reuses the single-session audit and recording lifecycle, and emits one aggregate user notification instead of one notification per session.

### Backend And Provider Messages

Backend code should not return only pre-rendered Chinese or English messages for user-facing errors. It should prefer structured errors:

```text
code
messageKey
defaultMessage
details
```

The frontend can render `messageKey` through its locale files. `defaultMessage` is a safe fallback for logs, older clients, and extension compatibility.

Built-in and extension providers should expose localized metadata when possible:

```text
name
description
config field labels
config field help text
error message keys
```

Extension manifests can include an `i18n` block:

```text
i18n/
  zh-CN.json
  en-US.json
```

The core app loads extension locale files and merges them under the extension provider namespace so extension translations do not collide with core translations.

### Documentation

Repository documentation should be multilingual. The current repository already has `README.md` and `README_EN.md`; future documentation should keep language variants explicit and easy to find.

Recommended documentation defaults:

- Keep the primary Chinese README as `README.md`.
- Keep the English README as `README_EN.md` unless the project later standardizes on `README.en-US.md`.
- Add a language selector near the top of each README variant.
- Preserve commands, paths, package names, config keys, code blocks, and URLs exactly across translations.
- Keep docs section order aligned across languages.

Design and operator docs can use language-specific sibling files:

```text
docs/<topic>.md
docs/<topic>.en-US.md
```

Extension repositories should follow the same rule:

```text
README.md
README_EN.md
docs/...
```

When extension packages include docs, their manifest should declare available documentation languages.

## Configuration And Credentials

First version:

- Keep connection config in memory.
- Do not persist secrets unless a credential storage interface is ready.
- Avoid realistic default credentials in source code.

Later version:

- Store non-secret connection profiles locally.
- Store secrets through OS credential storage where available.
- Support import/export of non-secret profile metadata.

## Error Handling

- Creating a session must validate provider type and required config fields.
- Unknown provider type returns a clear error.
- Unknown session ID returns a clear error.
- Runtime provider errors emit `terminal:error:{sessionId}`.
- Normal exits emit `terminal:exit:{sessionId}`.
- Close must always attempt driver cleanup and remove the session from the manager.
- The app shutdown path must close all active sessions.

## Testing

Core tests:

- Session creation
- Duplicate or unknown session behavior
- Send routing
- Resize routing
- Close cleanup
- Close idempotency
- Provider registry lookup
- Provider config validation

Driver tests:

- Local driver can be tested behind a small interface.
- SSH driver should use an abstraction so auth and lifecycle can be unit tested without a real server.
- REPL drivers should test prompt, buffering, command execution boundaries, and result formatting.
- Extension protocol should have contract tests using fake extension processes.

Verification commands:

```shell
go test ./...
cd frontend && npm run build
```

## Implementation Phases

### Phase 1: Core Session Kernel

- Add `SessionManager`
- Add provider registry
- Add session-scoped events
- Convert local shell to the new model
- Convert SSH to the new model
- Replace duplicate frontend terminal components with `TerminalPane`

### Phase 2: SSH And Remote File Foundation

- Harden SSH config and auth model
- Add private key auth structure
- Add a protocol-neutral file-provider interface
- Add shared file listing, transfer, and operation APIs

### Phase 3: Extension Model

- Add extension manifest format
- Add installed extension discovery
- Add stdio extension host protocol
- Add offline package import
- Add GitHub Releases source model

### Phase 4: Official Extensions

- Build Kubernetes extension
- Build Docker extension
- Build MySQL extension
- Build Redis extension
- Build SFTP extension
- Build FTP extension
- Build S3 extension

### Phase 5: Marketplace-Like Experience Without Central Lock-In

- Add configurable GitHub extension sources
- Add update checks
- Add checksum and signature enforcement
- Add extension enable, disable, uninstall, and upgrade

## Deferred Decisions And First Defaults

- The official GitHub owner or repository name is a configuration value. Documentation should use `github.com/<owner>/galaxyterm-extensions` until the project chooses a real owner.
- The remote-file workspace is protocol neutral. Protocol-specific connection fields and operations come from extension metadata and negotiated capabilities.
- Extension package verification starts with checksums and manifest validation. Strong signatures can be added after the package format and release flow are proven.
