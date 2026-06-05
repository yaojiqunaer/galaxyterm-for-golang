# GalaxyTerm Terminal Access Suite Design

## Goal

GalaxyTerm should become a small, extensible terminal access desktop app. The core application stays lightweight and stable, while heavier terminal types such as Kubernetes, Docker, MySQL, Redis, PostgreSQL, and MongoDB are delivered as optional extensions.

The first architectural target is not to implement every provider at once. The target is to create a clean terminal session kernel, a provider registry, and an extension model that can support many terminal types without duplicating frontend or backend lifecycle code.

## Confirmed Decisions

- The app will use Go-native SDKs, APIs, or protocols for provider implementations.
- The app will not rely on local CLI tools such as `kubectl`, `docker`, `mysql`, or `redis-cli` as the core implementation.
- The core app will include only foundational providers:
  - Local shell
  - SSH terminal
  - SFTP file access
- Kubernetes, Docker, databases, message systems, and other large integrations will be official extensions.
- Official extensions can be hosted in a personal GitHub organization or repository and distributed through GitHub Releases.
- Offline installation will be supported by downloading extension package files from GitHub Releases and importing them locally.

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

First implementation:

- Password authentication
- Session-scoped shell
- Resize support
- Clean close
- Known extension points for private key and passphrase authentication

Later hardening:

- Known hosts verification
- Host fingerprint prompts
- SSH agent support
- Jump host support

### SFTP

SFTP is built in because it is tightly related to SSH and is a foundational remote access feature.

First implementation can expose file operations through a file manager API rather than xterm. The provider should still share connection profile and auth structures with SSH.

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
```

Initial official extension targets:

- Kubernetes pod terminal through `client-go`
- Docker container terminal through Docker Engine API
- MySQL interactive REPL through Go MySQL protocol libraries
- Redis interactive REPL through Go Redis protocol libraries

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

### Phase 2: Built-In SSH And SFTP Foundation

- Harden SSH config and auth model
- Add private key auth structure
- Add SFTP service interfaces
- Add file listing and basic file operation API

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

### Phase 5: Marketplace-Like Experience Without Central Lock-In

- Add configurable GitHub extension sources
- Add update checks
- Add checksum and signature enforcement
- Add extension enable, disable, uninstall, and upgrade

## Deferred Decisions And First Defaults

- The official GitHub owner or repository name is a configuration value. Documentation should use `github.com/<owner>/galaxyterm-extensions` until the project chooses a real owner.
- The first SFTP scope is a backend file operation API plus a simple file list view. A full file manager can be built after the SSH/SFTP connection model is stable.
- Extension package verification starts with checksums and manifest validation. Strong signatures can be added after the package format and release flow are proven.
