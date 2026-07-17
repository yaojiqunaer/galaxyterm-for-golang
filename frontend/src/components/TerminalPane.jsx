import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import * as runtime from '../../wailsjs/runtime/runtime.js';
import * as SessionAPI from '../../wailsjs/go/session/API.js';
import * as Theme from '../../wailsjs/go/internal/Theme.js';
import { readClipboardText, writeClipboardText } from '../desktopBridge.js';
import { t } from '../i18n.js';
import {
  appendTerminalOutputTail,
  buildTerminalPasteRisk,
  parseShellIntegrationExitCode,
  shouldNotifyTerminalActivity,
  terminalOutputIndicatesPrompt,
} from '../terminalExecution.js';

function TerminalPane({
  request,
  settings,
  onAuditEvent,
  onCommandSubmitted,
  onConfirmPaste,
  onOutputActivity,
  onSessionCreated,
  onSessionClosed,
  onStatusChange,
}, ref) {
  const containerRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const searchAddon = useRef(null);
  const sessionId = useRef(null);
  const startedAt = useRef(new Date());
  const transcript = useRef([]);
  const outputEvents = useRef([]);
  const inputLine = useRef('');
  const lastCommand = useRef('');
  const lastCommandStartedAt = useRef(null);
  const outputTail = useRef('');
  const durationTimer = useRef(null);
  const lastActivityNotificationAt = useRef(null);
  const pasteConfirmationPending = useRef(false);
  const callbacksRef = useRef({
    onAuditEvent,
    onCommandSubmitted,
    onConfirmPaste,
    onOutputActivity,
    onSessionClosed,
    onSessionCreated,
    onStatusChange,
  });
  callbacksRef.current = {
    onAuditEvent,
    onCommandSubmitted,
    onConfirmPaste,
    onOutputActivity,
    onSessionClosed,
    onSessionCreated,
    onStatusChange,
  };
  const terminalStatus = useRef({
    cols: 80,
    durationMs: 0,
    lastCommand: '',
    rows: 24,
    status: 'connecting',
    updatedAt: new Date().toISOString(),
  });

  const emitStatus = (patch) => {
    emitTerminalStatus(callbacksRef.current.onStatusChange, terminalStatus, patch);
  };

  const stopDurationTicker = () => {
    if (durationTimer.current) window.clearInterval(durationTimer.current);
    durationTimer.current = null;
  };

  const startDurationTicker = () => {
    stopDurationTicker();
    durationTimer.current = window.setInterval(() => {
      if (!isCommandInFlight(terminalStatus.current.status)) {
        stopDurationTicker();
        return;
      }
      emitStatus({
        durationMs: commandDurationMs(lastCommandStartedAt.current),
      });
    }, 500);
  };

  const markCommandSubmitted = (command) => {
    lastCommand.current = command;
    lastCommandStartedAt.current = new Date();
    outputTail.current = '';
    emitStatus({
      durationMs: 0,
      error: '',
      exitCode: undefined,
      lastCommand: command,
      status: 'busy',
    });
    startDurationTicker();
    callbacksRef.current.onCommandSubmitted?.(command);
  };

  const markCommandInterrupted = () => {
    if (!isCommandInFlight(terminalStatus.current.status)) return;
    emitStatus({
      durationMs: commandDurationMs(lastCommandStartedAt.current),
      status: 'interrupting',
    });
    callbacksRef.current.onAuditEvent?.({
      detail: lastCommand.current,
      type: 'command.interrupt',
    });
  };

  const trackOutgoingData = (data) => {
    if (String(data || '').includes('\u0003')) markCommandInterrupted();
    trackSubmittedCommands(data, inputLine, markCommandSubmitted);
  };

  const confirmTerminalPaste = async (data) => {
    const risk = buildTerminalPasteRisk(data);
    if (!risk) return true;
    const detail = `${risk.characterCount} chars, ${risk.lineCount} lines`;
    if (pasteConfirmationPending.current) {
      callbacksRef.current.onAuditEvent?.({ detail, type: 'paste.blocked' });
      return false;
    }
    pasteConfirmationPending.current = true;
    let allowed = false;
    try {
      allowed = await callbacksRef.current.onConfirmPaste?.(risk) === true;
    } catch {
      allowed = false;
    } finally {
      pasteConfirmationPending.current = false;
    }
    callbacksRef.current.onAuditEvent?.({
      detail,
      type: allowed ? 'paste.sent' : 'paste.blocked',
    });
    return allowed;
  };

  useImperativeHandle(ref, () => ({
    fit: () => {
      fitAddon.current?.fit();
    },
    send: (data) => {
      if (sessionId.current) {
        trackOutgoingData(data);
        SessionAPI.Send(sessionId.current, data);
        term.current?.focus();
      }
    },
    interrupt: () => {
      if (sessionId.current) {
        markCommandInterrupted();
        SessionAPI.Send(sessionId.current, '\u0003');
        term.current?.focus();
      }
    },
    copySelection: async () => {
      const selection = term.current?.getSelection() || '';
      if (selection) await writeClipboardText(selection);
      term.current?.focus();
      return selection;
    },
    pasteClipboard: async () => {
      const text = await readClipboardText();
      if (text && sessionId.current) {
        if (!await confirmTerminalPaste(text)) return null;
        trackOutgoingData(text);
        SessionAPI.Send(sessionId.current, text);
        term.current?.focus();
      }
      return text || '';
    },
    clear: () => {
      term.current?.clear();
      term.current?.focus();
    },
    reset: () => {
      term.current?.reset();
      term.current?.focus();
    },
    copyTranscript: async () => {
      const text = terminalBufferText(term.current);
      if (text) await writeClipboardText(text);
      term.current?.focus();
      return text;
    },
    transcript: () => ({
      raw: transcript.current.join(''),
      screen: terminalBufferText(term.current),
    }),
    recording: () => ({
      cols: term.current?.cols || 80,
      outputEvents: outputEvents.current,
      raw: transcript.current.join(''),
      rows: term.current?.rows || 24,
      screen: terminalBufferText(term.current),
      startedAt: startedAt.current.toISOString(),
    }),
    findNext: (keyword) => searchAddon.current?.findNext(keyword),
    findPrevious: (keyword) => searchAddon.current?.findPrevious(keyword),
    clearSearch: () => searchAddon.current?.clearDecorations(),
  }), []);

  useEffect(() => {
    let disposed = false;
    let observer = null;
    let cleanupData = null;
    let cleanupError = null;
    let cleanupExit = null;

    async function initTerminal() {
      const terminalTheme = await resolveTerminalTheme(settings);
      if (disposed) return;

      term.current = new Terminal({
        rows: 24,
        cols: 80,
        cursorBlink: true,
        allowProposedApi: true,
        allowTransparency: true,
        macOptionIsMeta: true,
        macOptionClickForcesSelection: true,
        scrollback: settings?.scrollback || 5000,
        fontSize: settings?.fontSize || 14,
        fontFamily: settings?.fontFamily || 'SFMono-Regular,JetBrains Mono,Menlo,Consolas,Liberation Mono,monospace',
        theme: terminalTheme,
      });

      fitAddon.current = new FitAddon();
      searchAddon.current = new SearchAddon();
      term.current.loadAddon(fitAddon.current);
      term.current.loadAddon(searchAddon.current);
      term.current.open(containerRef.current);
      emitStatus({ status: 'connecting' });

      const createdSessionId = await SessionAPI.CreateSession(request);
      if (disposed) {
        await SessionAPI.Close(createdSessionId);
        return;
      }

      sessionId.current = createdSessionId;
      emitStatus({
        cols: term.current?.cols || 80,
        rows: term.current?.rows || 24,
        status: 'connected',
      });
      callbacksRef.current.onSessionCreated?.(createdSessionId);
      callbacksRef.current.onAuditEvent?.({
        detail: request.displayName || request.providerType,
        type: 'session.created',
      });

      cleanupData = runtime.EventsOn(`terminal:data:${createdSessionId}`, (event) => {
        const data = event?.Data || event?.data || '';
        const activityAt = Date.now();
        if (data && shouldNotifyTerminalActivity(lastActivityNotificationAt.current, activityAt)) {
          lastActivityNotificationAt.current = activityAt;
          callbacksRef.current.onOutputActivity?.(new Date(activityAt).toISOString());
        }
        if (data) transcript.current.push(data);
        if (data) outputEvents.current.push({ time: elapsedSeconds(startedAt.current), data });
        if (data) outputTail.current = appendTerminalOutputTail(outputTail.current, data);
        const exitCode = parseShellIntegrationExitCode(data);
        if (
          data
          && isCommandInFlight(terminalStatus.current.status)
          && (exitCode !== null || terminalOutputIndicatesPrompt(outputTail.current))
        ) {
          stopDurationTicker();
          emitStatus({
            durationMs: commandDurationMs(lastCommandStartedAt.current),
            ...(exitCode !== null ? { exitCode } : {}),
            status: lastCommand.current ? 'idle' : 'connected',
          });
        }
        term.current?.write(data);
      });
      cleanupError = runtime.EventsOn(`terminal:error:${createdSessionId}`, (event) => {
        stopDurationTicker();
        const message = event?.Error?.defaultMessage || event?.error?.defaultMessage || t('terminal.error.disconnected');
        transcript.current.push(`\r\n${message}`);
        outputEvents.current.push({ time: elapsedSeconds(startedAt.current), data: `\r\n${message}` });
        emitStatus({
          durationMs: commandDurationMs(lastCommandStartedAt.current),
          error: message,
          status: 'error',
        });
        callbacksRef.current.onAuditEvent?.({ detail: message, type: 'session.error' });
        term.current?.writeln(`\r\n${message}`);
      });
      cleanupExit = runtime.EventsOn(`terminal:exit:${createdSessionId}`, () => {
        stopDurationTicker();
        transcript.current.push(`\r\n${t('terminal.status.closed')}`);
        outputEvents.current.push({ time: elapsedSeconds(startedAt.current), data: `\r\n${t('terminal.status.closed')}` });
        emitStatus({
          durationMs: commandDurationMs(lastCommandStartedAt.current),
          status: 'closed',
        });
        callbacksRef.current.onAuditEvent?.({ type: 'session.closed' });
        term.current?.writeln(`\r\n${t('terminal.status.closed')}`);
        callbacksRef.current.onSessionClosed?.(createdSessionId);
      });

      term.current.onResize((size) => {
        callbacksRef.current.onAuditEvent?.({ detail: `${size.cols}x${size.rows}`, type: 'terminal.resize' });
        emitStatus({
          cols: size.cols,
          rows: size.rows,
        });
        SessionAPI.Resize(createdSessionId, size.cols, size.rows);
      });
      term.current.onData(async (data) => {
        if (pasteConfirmationPending.current) return;
        if (!await confirmTerminalPaste(data)) return;
        if (data.includes('\r') || data.includes('\n')) {
          callbacksRef.current.onAuditEvent?.({ type: 'input.enter' });
        }
        trackOutgoingData(data);
        SessionAPI.Send(createdSessionId, data);
      });

      setTimeout(() => {
        fitAddon.current?.fit();
        term.current?.focus();
      }, 0);

      const handleResize = () => fitAddon.current?.fit();
      window.addEventListener('resize', handleResize);

      if (containerRef.current?.parentElement) {
        observer = new window.ResizeObserver(() => fitAddon.current?.fit());
        observer.observe(containerRef.current.parentElement);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    let cleanupWindow = null;
    initTerminal()
      .then((cleanup) => {
        cleanupWindow = cleanup;
      })
      .catch((error) => {
        emitStatus({
          error: String(error),
          status: 'error',
        });
        term.current?.writeln(`\r\n${t('terminal.error.createFailed')}: ${error}`);
      });

    return () => {
      disposed = true;
      stopDurationTicker();
      emitStatus({
        durationMs: commandDurationMs(lastCommandStartedAt.current),
        status: 'closed',
      });
      cleanupData?.();
      cleanupError?.();
      cleanupExit?.();
      cleanupWindow?.();
      observer?.disconnect();
      if (sessionId.current) {
        SessionAPI.Close(sessionId.current);
      }
      term.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!term.current) return;
    term.current.options.fontSize = settings?.fontSize || 14;
    term.current.options.fontFamily = settings?.fontFamily || 'SFMono-Regular,JetBrains Mono,Menlo,Consolas,Liberation Mono,monospace';
    term.current.options.scrollback = settings?.scrollback || 5000;
    fitAddon.current?.fit();
  }, [settings?.fontFamily, settings?.fontSize, settings?.scrollback]);

  useEffect(() => {
    let disposed = false;
    if (!term.current) return () => {
      disposed = true;
    };
    resolveTerminalTheme(settings).then((terminalTheme) => {
      if (!disposed && term.current) term.current.options.theme = terminalTheme;
    });
    return () => {
      disposed = true;
    };
  }, [settings?.terminalTheme, settings?.appTheme]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

async function resolveTerminalTheme(settings = {}) {
  const selectedTheme = settings.terminalTheme || 'auto';
  if (selectedTheme && selectedTheme !== 'auto') {
    try {
      return await Theme.GetCustomTheme(selectedTheme);
    } catch {
      // Fall back to automatic theme when a saved custom theme is no longer available.
    }
  }
  const themeDark = await Theme.GetDarkTheme();
  const themeLight = await Theme.GetLightTheme();
  if (settings.appTheme === 'dark') return normalizeTerminalTheme(themeDark, true);
  if (settings.appTheme === 'light') return themeLight;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? normalizeTerminalTheme(themeDark, true) : themeLight;
}

function normalizeTerminalTheme(theme, dark = false) {
  if (!dark) return theme;
  return {
    ...theme,
    background: theme?.background || '#071013',
    cursor: theme?.cursor || '#e5c07b',
    foreground: theme?.foreground || '#d7e2ea',
    selectionBackground: theme?.selectionBackground || '#23424d',
  };
}

function elapsedSeconds(startedAt) {
  return Math.max(0, Number(((Date.now() - startedAt.getTime()) / 1000).toFixed(6)));
}

function commandDurationMs(startedAt) {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - startedAt.getTime());
}

function emitTerminalStatus(onStatusChange, statusRef, patch = {}) {
  statusRef.current = {
    ...statusRef.current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  onStatusChange?.(statusRef.current);
}

function isCommandInFlight(status) {
  return status === 'busy' || status === 'interrupting';
}

function trackSubmittedCommands(data, inputLineRef, onCommandSubmitted) {
  if (String(data || '').includes('\u001b')) return;
  for (const char of String(data || '')) {
    if (char === '\r' || char === '\n') {
      const command = inputLineRef.current.trim();
      if (command) onCommandSubmitted?.(command);
      inputLineRef.current = '';
      continue;
    }
    if (char === '\u007f' || char === '\b') {
      inputLineRef.current = inputLineRef.current.slice(0, -1);
      continue;
    }
    if (char >= ' ' && char !== '\u001b') {
      inputLineRef.current += char;
    }
  }
}

function terminalBufferText(terminal) {
  if (!terminal?.buffer?.active) return '';
  const buffer = terminal.buffer.active;
  const lines = [];
  for (let index = 0; index < buffer.length; index += 1) {
    lines.push(buffer.getLine(index)?.translateToString(true) || '');
  }
  return lines.join('\n').replace(/\n+$/, '');
}

export default forwardRef(TerminalPane);
