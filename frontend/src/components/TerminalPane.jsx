import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import * as runtime from '../../wailsjs/runtime/runtime.js';
import * as SessionAPI from '../../wailsjs/go/session/API.js';
import * as Theme from '../../wailsjs/go/internal/Theme.js';
import { t } from '../i18n.js';

function TerminalPane({ request, settings, onSessionCreated, onSessionClosed }, ref) {
  const containerRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const searchAddon = useRef(null);
  const sessionId = useRef(null);
  const transcript = useRef([]);

  useImperativeHandle(ref, () => ({
    fit: () => {
      fitAddon.current?.fit();
    },
    send: (data) => {
      if (sessionId.current) {
        SessionAPI.Send(sessionId.current, data);
        term.current?.focus();
      }
    },
    copySelection: async () => {
      const selection = term.current?.getSelection() || '';
      if (selection) await navigator.clipboard?.writeText(selection);
      term.current?.focus();
      return selection;
    },
    pasteClipboard: async () => {
      const text = await navigator.clipboard?.readText?.();
      if (text && sessionId.current) {
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
      if (text) await navigator.clipboard?.writeText(text);
      term.current?.focus();
      return text;
    },
    transcript: () => ({
      raw: transcript.current.join(''),
      screen: terminalBufferText(term.current),
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
        fontSize: settings?.fontSize || 13,
        fontFamily: settings?.fontFamily || 'Consolas,Liberation Mono,Menlo,Courier,monospace',
        theme: terminalTheme,
      });

      fitAddon.current = new FitAddon();
      searchAddon.current = new SearchAddon();
      term.current.loadAddon(fitAddon.current);
      term.current.loadAddon(searchAddon.current);
      term.current.open(containerRef.current);
      term.current.writeln(t('terminal.status.connecting'));

      const createdSessionId = await SessionAPI.CreateSession(request);
      if (disposed) {
        await SessionAPI.Close(createdSessionId);
        return;
      }

      sessionId.current = createdSessionId;
      onSessionCreated?.(createdSessionId);

      cleanupData = runtime.EventsOn(`terminal:data:${createdSessionId}`, (event) => {
        const data = event?.Data || event?.data || '';
        if (data) transcript.current.push(data);
        term.current?.write(data);
      });
      cleanupError = runtime.EventsOn(`terminal:error:${createdSessionId}`, (event) => {
        const message = event?.Error?.defaultMessage || event?.error?.defaultMessage || t('terminal.error.disconnected');
        transcript.current.push(`\r\n${message}`);
        term.current?.writeln(`\r\n${message}`);
      });
      cleanupExit = runtime.EventsOn(`terminal:exit:${createdSessionId}`, () => {
        transcript.current.push(`\r\n${t('terminal.status.closed')}`);
        term.current?.writeln(`\r\n${t('terminal.status.closed')}`);
        onSessionClosed?.(createdSessionId);
      });

      term.current.onResize((size) => {
        SessionAPI.Resize(createdSessionId, size.cols, size.rows);
      });
      term.current.onData((data) => {
        if (isRiskyPaste(data) && !window.confirm(t('terminal.confirmPaste'))) {
          return;
        }
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
        term.current?.writeln(`\r\n${t('terminal.error.createFailed')}: ${error}`);
      });

    return () => {
      disposed = true;
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
    term.current.options.fontSize = settings?.fontSize || 13;
    term.current.options.fontFamily = settings?.fontFamily || 'Consolas,Liberation Mono,Menlo,Courier,monospace';
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
  if (settings.appTheme === 'dark') return themeDark;
  if (settings.appTheme === 'light') return themeLight;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? themeDark : themeLight;
}

function isRiskyPaste(data) {
  const lineBreaks = (data.match(/\r|\n/g) || []).length;
  return data.length > 120 || lineBreaks >= 2;
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
