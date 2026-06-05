# Terminal Access Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lightweight GalaxyTerm core that supports multi-session local and SSH terminals through one backend API and one frontend terminal component.

**Architecture:** Add a backend `SessionManager`, `ProviderRegistry`, stream driver interface, and session-scoped events. Convert local shell and SSH into built-in providers. Replace duplicated frontend terminal components with a unified `TerminalPane` and a small i18n layer.

**Tech Stack:** Go 1.23, Wails v2, xterm.js, React, Ant Design.

---

## File Structure

- Create `internal/session/types.go`: shared request, provider, session, event, and structured error types.
- Create `internal/session/manager.go`: thread-safe session lifecycle and routing API.
- Create `internal/session/manager_test.go`: unit tests for create, send, resize, close, and unknown session behavior.
- Create `internal/terminal/local_provider.go`: local shell provider and stream driver.
- Create `internal/terminal/ssh_provider.go`: SSH provider and stream driver.
- Modify `main.go`: bind the new session manager instead of fixed `PtyTerminal` and `SshTerminal` instances.
- Create `frontend/src/locales/zh-CN.json`: Chinese UI strings.
- Create `frontend/src/locales/en-US.json`: English UI strings.
- Create `frontend/src/i18n.js`: locale selection and translation helper.
- Create `frontend/src/components/TerminalPane.jsx`: unified xterm component.
- Modify `frontend/src/App.jsx`: use provider metadata and create session modal.
- Remove or stop using `frontend/src/components/Terminal.jsx` and `frontend/src/components/SshTerm.jsx`.

## Task 1: Backend Session Types

**Files:**

- Create: `internal/session/types.go`
- Test: `internal/session/manager_test.go`

- [ ] **Step 1: Write failing type-level manager test**

Create `internal/session/manager_test.go` with a fake driver and a test that imports the missing session package API:

```go
package session

import (
	"context"
	"testing"
)

type fakeDriver struct {
	sent    []string
	resizes []Resize
	closed  bool
}

func (d *fakeDriver) Start(ctx context.Context, emit Emitter) error { return nil }
func (d *fakeDriver) Send(data string) error {
	d.sent = append(d.sent, data)
	return nil
}
func (d *fakeDriver) Resize(cols uint16, rows uint16) error {
	d.resizes = append(d.resizes, Resize{Cols: cols, Rows: rows})
	return nil
}
func (d *fakeDriver) Close() error {
	d.closed = true
	return nil
}

func TestManagerRoutesOperationsToCreatedSession(t *testing.T) {
	driver := &fakeDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type:        "fake",
		NameKey:     "provider.fake.name",
		Description: "Fake provider",
		NewDriver: func(req CreateSessionRequest) (Driver, error) {
			return driver, nil
		},
	})

	id, err := manager.Create(context.Background(), CreateSessionRequest{ProviderType: "fake", DisplayName: "Fake"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := manager.Send(id, "hello"); err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	if err := manager.Resize(id, 120, 40); err != nil {
		t.Fatalf("Resize returned error: %v", err)
	}
	if err := manager.Close(id); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	if got := driver.sent; len(got) != 1 || got[0] != "hello" {
		t.Fatalf("sent = %#v, want one hello", got)
	}
	if got := driver.resizes; len(got) != 1 || got[0].Cols != 120 || got[0].Rows != 40 {
		t.Fatalf("resizes = %#v, want 120x40", got)
	}
	if !driver.closed {
		t.Fatal("driver was not closed")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/session`

Expected: FAIL because `internal/session` types and functions do not exist.

- [ ] **Step 3: Add minimal types and manager skeleton**

Create `internal/session/types.go` and `internal/session/manager.go` with `Driver`, `Provider`, `CreateSessionRequest`, `Resize`, `Emitter`, and `Manager` APIs used by the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/session`

Expected: PASS.

## Task 2: Manager Error Cases And Events

**Files:**

- Modify: `internal/session/types.go`
- Modify: `internal/session/manager.go`
- Modify: `internal/session/manager_test.go`

- [ ] **Step 1: Add failing tests for unknown provider, unknown session, and idempotent close**

Add tests that assert:

- `Create` with missing provider returns `ErrUnknownProvider`.
- `Send` with missing session returns `ErrUnknownSession`.
- `Close` can be called twice without panic or second driver close.

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/session`

Expected: FAIL on missing structured errors and close behavior.

- [ ] **Step 3: Implement structured errors and safe close**

Add `AppError` with `Code`, `MessageKey`, `DefaultMessage`, and `Details`. Make manager methods return structured errors for unknown provider/session. Ensure `Close` removes the session before closing the driver and treats repeated close as no-op.

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./internal/session`

Expected: PASS.

## Task 3: Built-In Local And SSH Providers

**Files:**

- Create: `internal/terminal/local_provider.go`
- Create: `internal/terminal/ssh_provider.go`
- Modify: `internal/terminal/pty_terminal.go` or leave unused
- Modify: `internal/terminal/ssh_terminal.go` or leave unused

- [ ] **Step 1: Add provider metadata test**

Add a test that registers local and SSH providers and checks `ListProviders` returns both provider types with stable translation keys.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/...`

Expected: FAIL because providers are not implemented.

- [ ] **Step 3: Implement local provider**

Implement local provider with `github.com/creack/pty`, one process per session, session-scoped output emitter, resize, send, and close.

- [ ] **Step 4: Implement SSH provider**

Implement SSH provider with `golang.org/x/crypto/ssh`, typed config from request config map, password auth, stdout/stderr output, resize, send, and close.

- [ ] **Step 5: Run tests**

Run: `go test ./...`

Expected: PASS.

## Task 4: Wails Binding

**Files:**

- Modify: `main.go`
- Add generated Wails bindings after build if Wails generation updates `frontend/wailsjs`.

- [ ] **Step 1: Replace fixed terminal objects**

Bind one `SessionManager` object to Wails instead of `PtyTerminal` and `SshTerminal`.

- [ ] **Step 2: Register built-in providers at startup**

Register local and SSH providers before `wails.Run`.

- [ ] **Step 3: Run backend tests**

Run: `go test ./...`

Expected: PASS.

## Task 5: Frontend i18n Foundation

**Files:**

- Create: `frontend/src/locales/zh-CN.json`
- Create: `frontend/src/locales/en-US.json`
- Create: `frontend/src/i18n.js`

- [ ] **Step 1: Add locale files**

Include keys for app title, new terminal button, modal fields, provider labels, validation errors, and terminal status text.

- [ ] **Step 2: Add translation helper**

Implement `t(key, fallback)` and locale detection using user browser language with `en-US` fallback.

- [ ] **Step 3: Run frontend build**

Run: `cd frontend && npm run build`

Expected: PASS.

## Task 6: Unified TerminalPane Frontend

**Files:**

- Create: `frontend/src/components/TerminalPane.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Replace per-provider terminal components**

Implement `TerminalPane` with xterm.js, fit addon, session-scoped event subscription, send, resize, close, and terminal status messages.

- [ ] **Step 2: Replace App session model**

Use `ListProviders`, provider selector, dynamic first-pass config fields for local and SSH, and `Create` to open tabs.

- [ ] **Step 3: Run frontend build**

Run: `cd frontend && npm run build`

Expected: PASS.

## Task 7: Final Verification

**Files:**

- All touched files

- [ ] **Step 1: Run backend verification**

Run: `go test ./...`

Expected: PASS.

- [ ] **Step 2: Run frontend verification**

Run: `cd frontend && npm run build`

Expected: PASS.

- [ ] **Step 3: Review git status**

Run: `git status --short`

Expected: only intended files plus pre-existing `.DS_Store` untracked files.
