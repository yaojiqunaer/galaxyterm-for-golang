# GalaxyTerm 扩展分发

[English](extensions_EN.md) | 简体中文

GalaxyTerm 核心包内置本地终端与 SSH。SFTP、FTP/FTPS、S3、Kubernetes、Docker、数据库及其他终端或文件协议通过 `.gtx` 扩展分发。

## 在线安装

在“扩展”页面添加以下任一种 HTTPS 地址：

- GitHub 仓库：`https://github.com/<owner>/<repo>`
- GitHub Releases：`https://github.com/<owner>/<repo>/releases`
- 索引直链：`https://example.com/galaxyterm-index.json`

GitHub 仓库与 Releases 地址会解析为：

```text
https://github.com/<owner>/<repo>/releases/latest/download/galaxyterm-index.json
```

刷新扩展源后，GalaxyTerm 只展示适配当前操作系统和 CPU 架构的扩展。点击在线安装或更新时，客户端会限制下载大小、校验索引中的 SHA-256、读取包内 `manifest.json`，再执行与离线安装相同的清单、路径和包内校验。

## Release 索引

每个 Release 上传 `.gtx` 包和名为 `galaxyterm-index.json` 的索引。相对 URL 会以索引地址为基准解析，适合把索引与安装包放在同一个 GitHub Release：

```json
{
  "apiVersion": "v1",
  "extensions": [
    {
      "manifest": {
        "id": "galaxyterm-extension-sftp",
        "name": "SFTP",
        "version": "0.1.0",
        "apiVersion": "v1",
        "description": "SFTP file provider for GalaxyTerm",
        "runtime": {
          "protocol": "stdio-json-v1",
          "entrypoint": "bin/galaxyterm-extension-sftp"
        },
        "fileProviders": [
          {
            "type": "sftp",
            "protocol": "sftp",
            "capabilities": ["list", "stat", "read", "write", "mkdir", "rename", "delete"],
            "authMethods": ["password", "privateKey"]
          }
        ],
        "locales": ["zh-CN", "en-US"]
      },
      "assets": [
        {
          "os": "darwin",
          "arch": "arm64",
          "url": "galaxyterm-extension-sftp_0.1.0_darwin_arm64.gtx",
          "sha256": "<64 位十六进制 SHA-256>"
        },
        {
          "os": "linux",
          "arch": "amd64",
          "url": "galaxyterm-extension-sftp_0.1.0_linux_amd64.gtx",
          "sha256": "<64 位十六进制 SHA-256>"
        }
      ]
    }
  ]
}
```

`manifest` 必须与对应 `.gtx` 包内的 `manifest.json` 一致。每个当前平台资产必须提供 HTTPS 或相对 `.gtx` URL，以及该完整文件的 SHA-256。`os` 和 `arch` 可使用 `all` 表示通用包；精确平台资产优先于通用资产。

生成校验值：

```shell
shasum -a 256 dist/extensions/*.gtx
```

## 离线安装

在可联网机器下载 `.gtx`，传输到目标机器后，在“扩展”页面选择“离线安装”并填写本地绝对路径。离线安装不访问扩展源，仍会验证包内清单、校验文件、文件数量、解压体积和安全路径。

官方 SFTP 扩展可使用以下命令构建：

```shell
./scripts/package-extension.sh sftp
```

产物位于 `dist/extensions/`。
