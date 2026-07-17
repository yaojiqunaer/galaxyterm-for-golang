# File Provider Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move remote file protocols behind an installable `.gtx` sidecar contract so SFTP, FTP, S3, and future providers do not enlarge or couple the GalaxyTerm core.

**Architecture:** The core owns the protocol-neutral file workspace and a small stdio JSON request/response client. Installed extension manifests declare a runtime entrypoint plus file-provider capabilities; the extension registry resolves a provider to its installed executable. Official protocol implementations are separate executables and packages, beginning with SFTP, while FTP and S3 use the same contract later.

**Tech Stack:** Go 1.23, Wails v2, JSON Lines over stdio, zip-based `.gtx` packages, Node structural tests, Go unit/integration tests.

---

### Task 1: Harden package and runtime metadata

**Files:**
- Modify: `internal/extensions/manifest.go`
- Modify: `internal/extensions/manifest_test.go`
- Modify: `internal/extensions/api.go`
- Modify: `internal/extensions/api_test.go`

- [x] **Step 1: Write failing manifest tests**

Add tests proving that file-provider runtimes require `stdio-json-v1`, a relative entrypoint, known capabilities, and unique provider types.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `go test ./internal/extensions`

Expected: FAIL because runtime validation and installed runtime resolution do not exist.

- [x] **Step 3: Implement safe installation**

Add a runtime manifest, capability constants, zip-slip and symlink rejection, bounded extraction, executable permission restoration, atomic replacement, and `ResolveFileProvider(type)`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `go test ./internal/extensions`

Expected: PASS.

### Task 2: Add protocol-neutral sidecar client

**Files:**
- Create: `internal/files/protocol.go`
- Create: `internal/files/protocol_test.go`
- Create: `internal/files/sidecar.go`
- Create: `internal/files/sidecar_test.go`
- Replace: `internal/files/sftp_api.go`
- Replace: `internal/files/sftp_api_test.go`

- [x] **Step 1: Write failing contract and fake-sidecar tests**

Cover provider resolution, request IDs, API version, capability rejection, context timeout, malformed responses, structured errors, and successful list/read/write operations.

- [x] **Step 2: Run focused tests and verify RED**

Run: `go test ./internal/files`

Expected: FAIL because the generic host and sidecar client are absent.

- [x] **Step 3: Implement the smallest generic host**

Expose `List`, `ReadFile`, `WriteFile`, `Mkdir`, `Rename`, and `Delete` using a shared request model. Resolve provider executables through an interface and send one bounded JSON request to an isolated sidecar process per operation.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `go test ./internal/files`

Expected: PASS.

### Task 3: Wire the core and migrate the file workspace

**Files:**
- Modify: `main.go`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/appStructure.test.mjs`
- Modify: `frontend/wailsjs/go/files/API.js`
- Modify: `frontend/wailsjs/go/files/API.d.ts`
- Modify: `frontend/src/locales/zh-CN.json`
- Modify: `frontend/src/locales/en-US.json`

- [x] **Step 1: Write failing frontend structure tests**

Require the file workspace to select an installed file provider, pass `providerType`, hide unsupported actions by capability, and retain saved SSH profile reuse for SFTP.

- [x] **Step 2: Run tests and verify RED**

Run: `cd frontend && npm run test:app-structure`

Expected: FAIL because the file page still calls the built-in SFTP API directly.

- [x] **Step 3: Bind one shared extension registry**

Construct `extensions.API` once in `main.go`, inject it into `files.API`, and update Wails request types and file-page state to use installed provider metadata.

- [x] **Step 4: Run tests and verify GREEN**

Run: `cd frontend && npm run test:app-structure && npm run build`

Expected: PASS.

### Task 4: Ship an official SFTP extension reference

**Files:**
- Create: `extensions/official/sftp/main.go`
- Create: `extensions/official/sftp/handler.go`
- Create: `extensions/official/sftp/handler_test.go`
- Create: `extensions/official/sftp/manifest.json`
- Create: `scripts/package-extension.sh`
- Modify: `README.md`
- Modify: `README_EN.md`

- [x] **Step 1: Write failing handler tests**

Verify request validation, default port/path, authentication parsing, capability mapping, and structured error responses without requiring a live SSH server.

- [x] **Step 2: Run tests and verify RED**

Run: `go test ./extensions/official/sftp`

Expected: FAIL because the extension executable is absent.

- [x] **Step 3: Implement and package SFTP outside the core**

Move SFTP-specific code into the sidecar executable and add a deterministic packaging script that writes `manifest.json`, the current platform binary, checksums, docs, and license into a `.gtx` archive.

- [x] **Step 4: Verify the full product**

Run: `go test ./...`, `go vet ./...`, all frontend tests, `npm run build`, package the SFTP extension, install it through `InstallOffline`, and execute a fake-sidecar file listing integration test.

Expected: all checks pass and the GalaxyTerm core no longer imports `github.com/pkg/sftp`.
