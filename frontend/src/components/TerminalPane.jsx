import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import * as runtime from '../../wailsjs/runtime/runtime.js';
import * as SessionAPI from '../../wailsjs/go/session/API.js';
import * as Theme from '../../wailsjs/go/internal/Theme.js';
import { t } from '../i18n.js';

function TerminalPane({ request, onSessionCreated, onSessionClosed }, ref) {
  const containerRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const sessionId = useRef(null);

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
  }), []);

  useEffect(() => {
    let disposed = false;
    let observer = null;
    let cleanupData = null;
    let cleanupError = null;
    let cleanupExit = null;

    async function initTerminal() {
      const themeDark = await Theme.GetDarkTheme();
      const themeLight = await Theme.GetLightTheme();
      if (disposed) return;

      term.current = new Terminal({
        rows: 24,
        cols: 80,
        cursorBlink: true,
        allowProposedApi: true,
        allowTransparency: true,
        macOptionIsMeta: true,
        macOptionClickForcesSelection: true,
        scrollback: 5000,
        fontSize: 13,
        fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? themeDark : themeLight,
      });

      fitAddon.current = new FitAddon();
      term.current.loadAddon(fitAddon.current);
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
        term.current?.write(event?.Data || event?.data || '');
      });
      cleanupError = runtime.EventsOn(`terminal:error:${createdSessionId}`, (event) => {
        const message = event?.Error?.defaultMessage || event?.error?.defaultMessage || t('terminal.error.disconnected');
        term.current?.writeln(`\r\n${message}`);
      });
      cleanupExit = runtime.EventsOn(`terminal:exit:${createdSessionId}`, () => {
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

function isRiskyPaste(data) {
  const lineBreaks = (data.match(/\r|\n/g) || []).length;
  return data.length > 120 || lineBreaks >= 2;
}

export default forwardRef(TerminalPane);
