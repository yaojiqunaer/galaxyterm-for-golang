import React, { useEffect, useRef } from 'react';
import "@xterm/xterm/css/xterm.css"
import { Terminal } from '@xterm/xterm';
import { FitAddon } from "@xterm/addon-fit";
import * as runtime from "../../wailsjs/runtime/runtime.js";
import * as SshTerminal from "../../wailsjs/go/terminal/SshTerminal.js";
import * as Theme from "../../wailsjs/go/internal/Theme.js";

function SshTerm() {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);

    const themeDark = Theme.GetDarkTheme();
    const themeLight = Theme.GetLightTheme();

    useEffect(() => {
        // 初始化xterm终端
        term.current = new Terminal({
            rows: 24,
            cols: 80,
            cursorBlink: true,
            allowProposedApi: true,
            allowTransparency: true,
            macOptionIsMeta: true,
            macOptionClickForcesSelection: true,
            // 上下滚动缓冲区
            scrollback: 5000,
            fontSize: 13,
            fontFamily: "Consolas,Liberation Mono,Menlo,Courier,monospace",
            theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? themeLight : themeDark,
        });
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        // 将终端挂载到指定的DOM节点
        term.current.open(terminalRef.current);

        // 监听终端大小变化，并通过Wails事件发送给后端
        term.current.onResize(size => {
            console.log("Resized to rows: " + size.rows + "cols: " + size.cols);
            SshTerminal.Resize(size.cols, size.rows)
        });

        // 监听浏览器窗口变化并手动调整终端尺寸
        const handleResize = () => {
            fitAddon.current.fit();
        };
        window.addEventListener('resize', handleResize);

        // 监听用户输入，并通过Wails事件发送给后端
        term.current.onData((data) => {
            SshTerminal.Send(data)
        });

        // 监听来自Go后端的终端输出
        runtime.EventsOn('ssh-pty', (data) => {
            term.current.write(data);
        });

        // 启动后端
        SshTerminal.Connect().then(() => {
            setTimeout(() => {
                // 确保DOM完全渲染后再调用fit方法
                fitAddon.current.fit();
                term.current.focus();
            }, 0);
            runtime.LogDebug("Started backend");
        });

        // 清理监听器
        return () => {
            runtime.EventsOff('ssh-pty');
            term.current.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [themeDark, themeLight]);

    return (
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    );
}

export default SshTerm;