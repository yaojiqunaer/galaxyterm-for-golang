# Session Workspace Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every terminal session mounted until its tab is explicitly closed while making the session workspace flatter, clearer, and more space-efficient.

**Architecture:** Replace the separate tab-content and grid-content terminal trees with one keyed terminal pane deck. Tabs and split view become presentation modes over the same mounted `TerminalPane` instances. Move session controls into the tab bar, move context/audit indicators into the existing terminal status bar, and remove the redundant application debug footer.

**Tech Stack:** React 18, Ant Design Tabs, xterm.js, Sass, Node assertion tests, Wails/Go.

---

### Task 1: Lock the desired session behavior with failing tests

**Files:**
- Modify: `frontend/src/sessionPresentation.test.mjs`
- Modify: `frontend/src/appStructure.test.mjs`

- [x] **Step 1: Update the toolbar model expectation**

Assert that adjacent-session navigation remains available through shortcuts and menus but is no longer emitted as a permanent primary toolbar action.

- [x] **Step 2: Add workspace continuity structure assertions**

Assert that `renderTerminalPane(session)` appears in exactly one persistent pane deck, the tab bar owns the shared toolbar, the session page remains mounted while hidden, and the redundant `.statusbar` shell is gone.

- [x] **Step 3: Run tests and verify RED**

Run: `npm run test:sessions && npm run test:app-structure`

Expected: both tests fail because the old toolbar buttons, duplicate terminal trees, and application footer still exist.

### Task 2: Build one stable terminal pane deck

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/sessionPresentation.js`

- [x] **Step 1: Remove terminal children from Ant Design tab items**

Keep each tab item responsible only for its label, close affordance, and context menu.

- [x] **Step 2: Render every session once in a keyed pane slot**

Use one `sessions.map()` below the tab bar. In tabs mode only the active slot is visible; in split mode every slot is visible. Preserve `TerminalPane` keys so only explicit reconnect revisions remount a terminal.

- [x] **Step 3: Keep controls useful but quiet**

Place split/tabs, interrupt, reconnect, and overflow actions in `Tabs.tabBarExtraContent`. Remove permanent previous/next buttons while retaining existing keyboard shortcuts, command-palette actions, and session menu entries.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `npm run test:sessions && npm run test:app-structure`

Expected: PASS.

### Task 3: Consolidate session context and visual hierarchy

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/style.scss`
- Modify: `frontend/src/locales/zh-CN.json`
- Modify: `frontend/src/locales/en-US.json`

- [x] **Step 1: Move context into the terminal status bar**

Pass provider, target, user, audit, and recording information to `TerminalFrame`. Render essential context as compact facts and audit/recording as icon statuses with tooltips.

- [x] **Step 2: Flatten the tab chrome**

Use a contiguous professional tab rail with a strong active indicator, hover-only close affordances, stable truncation, and no card-like rounded tabs.

- [x] **Step 3: Remove redundant shell chrome**

Delete the global sessions/providers/core footer and obsolete `label.current` translations. Keep connection status and execution details in the terminal status bar where they belong.

- [x] **Step 4: Verify responsive layout**

At narrow widths, hide secondary context facts before controls, retain the active tab identity, and keep terminal content free from overlap.

### Task 4: Regression and runtime verification

**Files:**
- No production files expected beyond Tasks 1-3.

- [x] **Step 1: Run all frontend test scripts**

Run every `test:*` script declared in `frontend/package.json`.

- [x] **Step 2: Build frontend and backend**

Run: `npm run build` in `frontend`, then `go test ./...` at the repository root.

- [x] **Step 3: Verify real terminal continuity**

Open two local sessions in the Wails app, write distinguishable output in each, switch tabs, navigate to Connections and back, switch between Tabs and Split, and confirm the same terminal buffers and backend sessions remain active until a tab is closed.

- [x] **Step 3a: Verify ordinary Enter input is not treated as a paste**

Keep true multiline paste protection, but assert that `\r`, `\n`, and `\r\n` control sequences bypass paste confirmation. Rebuild the Wails QA app and execute a normal command with Return to confirm the regression is fixed end to end.

- [x] **Step 4: Verify desktop and narrow layouts visually**

Capture 1440x900 and compact-width screenshots. Confirm tab active state, status readability, no overlap, and increased terminal viewport height.

- [x] **Step 5: Commit the verified checkpoint**

Stage only this plan and the session workspace files, then commit with a focused message.
