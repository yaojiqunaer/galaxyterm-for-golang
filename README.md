# galaxyterm-for-golang

星河终端 golang语言版

项目立意自CharGPT 4o-mini - 星河象征着浩瀚与无垠，寓意终端的无尽可能性与广泛兼容性。

----

## 简介

> 中文 | [English](README_EN.md)

略

## 功能特性

<details>
  <summary><b>🕸 远程终端ssh连接</b></summary>
  提供安全可靠的远程ssh访问
</details>

<details>
  <summary><b>🔗 远程文件访问</b></summary>
  支持直接选择已保存的 SSH 连接浏览、编辑、上传和下载远程文件；无需重复填写 Host、端口和账号，系统凭据仅在执行操作时按需解析。
</details>

<details>
  <summary><b>🔀 SSH 端口转发</b></summary>
  支持复用已保存的 SSH 连接创建本地端口转发，并兼容密码、私钥和私钥口令认证；未保存凭据时可输入仅供本次使用的密码或私钥。
</details>

<details>
  <summary><b>🗂 连接管理与系统凭据</b></summary>
  支持保存 SSH 连接名称、分组、Host、端口、账号、认证方式、跳板机等非敏感配置；可选择将密码、私钥、私钥口令和跳板机密码保存到系统凭据库，连接配置和导出文件只保存凭据引用。连接管理页支持收藏优先、分组概览、打开收藏和按分组批量打开。
</details>

<details>
  <summary><b>🧾 审计日志与终端录屏</b></summary>
  记录会话打开、重连、关闭、错误、清屏、快捷命令和大段粘贴等操作事件；终端输出会保存为 asciinema v2 文本录屏。审计页使用只读 xterm 按原始时间戳还原 ANSI 颜色、回车覆盖、清屏和光标移动，支持播放、暂停、重播、拖动进度、逐事件跳转和倍速播放，并可导出 `.cast` 或 `.log`。
</details>

<details>
  <summary><b>🔐 敏感信息脱敏</b></summary>
  保存和导出审计记录、录屏时会对常见密码、Token、Authorization 头、私钥块等内容做基础脱敏；升级后读取旧记录时也会自动清洗历史元数据和录屏事件。默认不记录每个按键原文，只记录输入摘要和输出录屏。
</details>

<details>
  <summary><b>⏱ 命令执行状态与中断</b></summary>
  交互式终端会展示当前命令、实时耗时和运行状态；运行期间可通过工具栏、中断按钮或 `Ctrl+C` 发送标准 PTY 中断。Shell 提供 OSC 133 集成时会同时展示真实退出码，常见 Shell、PowerShell、MySQL、Redis 和 PostgreSQL 提示符可用于识别命令完成。
</details>

## 架构

----

## 安装

### 本地启动

```shell
CGO_LDFLAGS='-framework UniformTypeIdentifiers' go run -tags dev .
```

### 前端

#### 格式化插件

```shell
npm install normalize.css
```

#### xterm.js

```shell
npm install @xterm/xterm
npm install @xterm/addon-attach
npm install @xterm/addon-clipboard
npm install @xterm/addon-fit
npm install @xterm/addon-image
npm install @xterm/addon-search
npm install @xterm/addon-serialize
npm install @xterm/addon-unicode11
npm install @xterm/addon-web-links
npm install @xterm/addon-webgl
```
