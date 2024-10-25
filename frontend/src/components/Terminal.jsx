import React, {useEffect, useRef} from 'react';
import "@xterm/xterm/css/xterm.css"
import {Terminal} from '@xterm/xterm';
import {FitAddon} from "@xterm/addon-fit";
import * as runtime from "../../wailsjs/runtime/runtime.js";
import * as WailsApp from "../../wailsjs/go/main/App.js";
import * as Theme from "../../wailsjs/go/main/Theme.js";

function GalaxyTerminal() {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);

    const themeDark = Theme.GetDarkTheme();
    const themeLight = Theme.GetLightTheme();

    useEffect(() => {
        // 初始化xterm终端
        term.current = new Terminal({
            // rows: 24,
            // cols: 80,
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
        fitAddon.current.fit()
        term.current.focus();

        // 监听终端大小变化，并通过Wails事件发送给后端
        term.current.onResize(size => {
            console.log("Resized to rows: " + size.rows + "cols: " + size.cols);
            WailsApp.SetTTYSize(size.rows, size.cols).then(() => {
                runtime.LogDebug("Resized to rows: " + size.rows + "cols: " + size.cols);
            }).catch(error => console.error("Error setting TTY size:", error));
        });

        // 监听浏览器窗口变化并手动调整终端尺寸
        const handleResize = () => {
            fitAddon.current.fit();
        };

        window.addEventListener('resize', handleResize);

        // 监听用户输入，并通过Wails事件发送给后端
        term.current.onData((data) => {
            WailsApp.SendText(data).then(r => {
                runtime.LogDebug("Sent data: " + data);
            });
        });

        // 监听来自Go后端的终端输出
        runtime.EventsOn('local-tty', (data) => {
            runtime.LogDebug("Received data: " + data);
            term.current.write(data);
        });


        // 启动后端
        WailsApp.Start().then(r => {
            runtime.LogDebug("Started backend");
        });
        // 清理监听器
        return () => {
            runtime.EventsOff('local-tty');
            term.current.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [themeDark, themeLight]);

    return (
        <div ref={terminalRef} style={{width: '100%', height: '100%'}}/>
    );
}

export default GalaxyTerminal;