import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import "@xterm/xterm/css/xterm.css"
import { Terminal } from '@xterm/xterm';
import { FitAddon } from "@xterm/addon-fit";
import * as runtime from "../../wailsjs/runtime/runtime.js";
import * as PtyTerminal from "../../wailsjs/go/terminal/PtyTerminal.js";
import * as Theme from "../../wailsjs/go/internal/Theme.js";

function GalaxyTerminal(props, ref) {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    useImperativeHandle(ref, () => ({
        fit: () => {
            if (fitAddon.current) fitAddon.current.fit();
        }
    }), []);

    useEffect(() => {
        let disposed = false;
        let observer = null;
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
                fontFamily: "Consolas,Liberation Mono,Menlo,Courier,monospace",
                theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? themeDark : themeLight,
            });
            fitAddon.current = new FitAddon();
            term.current.loadAddon(fitAddon.current);
            term.current.open(terminalRef.current);
            setTimeout(() => {
                fitAddon.current.fit();
                term.current.focus();
            }, 0);
            term.current.onResize(size => {
                PtyTerminal.Resize(size.cols, size.rows)
            });
            const handleResize = () => {
                fitAddon.current.fit();
            };
            window.addEventListener('resize', handleResize);
            term.current.onData((data) => {
                PtyTerminal.Send(data)
            });
            runtime.EventsOn('local-pty', (data) => {
                term.current.write(data);
            });
            PtyTerminal.Connect().then(() => {
                setTimeout(() => {
                    fitAddon.current.fit();
                    term.current.focus();
                }, 0);
                runtime.LogDebug("Started backend");
            });
            // 监听终端父容器尺寸变化，自动fit
            if (terminalRef.current) {
                observer = new window.ResizeObserver(() => {
                    fitAddon.current && fitAddon.current.fit();
                });
                observer.observe(terminalRef.current.parentElement);
            }
            // 清理
            return () => {
                runtime.EventsOff('local-pty');
                term.current.dispose();
                window.removeEventListener('resize', handleResize);
                if (observer) observer.disconnect();
            };
        }
        let cleanup;
        initTerminal().then(fn => { cleanup = fn });
        return () => { disposed = true; if (cleanup) cleanup(); };
    }, []);

    return (
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    );
}

export default forwardRef(GalaxyTerminal);