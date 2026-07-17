# GalaxyTerm 扩展分发

[English](extensions_EN.md) | 简体中文

GalaxyTerm 核心包内置本地终端与 SSH。SFTP、FTP/FTPS、S3、Kubernetes、Docker、数据库及其他终端或文件协议通过 `.gtx` 扩展分发。

## 文件 Provider 能力

远程文件工作区只根据 `fileProviders[].capabilities` 展示可用操作，不包含协议专用分支。`list` 控制目录浏览，`read` 控制查看与下载，`write` 控制编辑与上传，`mkdir`、`rename`、`delete` 分别控制新建目录、重命名和删除。只有 `read` 而没有 `write` 时，文件以只读方式打开；删除操作默认需要二次确认。

FTP、S3、WebDAV 等新协议只需实现 `stdio-json-v1` 操作并声明真实能力，无需修改核心文件列表。对象存储不支持的操作应从 manifest 中省略，界面会自动隐藏对应入口。

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

`manifest` 必须与对应 `.gtx` 包内的 `manifest.json` 一致。每个当前平台资产必须提供 HTTPS 或相对 `.gtx` URL，以及该完整文件的 SHA-256。`os` 和 `arch` 可使用 `all` 表示通用包；精确平台资产优先于通用资产。平台包仅在运行入口等平台元数据不同时，可在资产内提供 `manifest` 覆盖；官方生成工具会自动处理 Windows `.exe` 入口。

从 `dist/extensions/` 中全部 `.gtx` 包读取清单、计算校验值并生成稳定排序的索引：

```shell
./scripts/generate-extension-index.sh
```

默认产物为 `dist/extensions/galaxyterm-index.json`，其中使用与索引同目录的相对安装包 URL。需要生成绝对 URL 时：

```shell
./scripts/generate-extension-index.sh \
  -base-url https://github.com/<owner>/<repo>/releases/download/<tag>/
```

同一目录中的包必须使用 `<扩展ID>_<版本>_<OS>_<架构>.gtx` 命名。同一扩展只能包含一个版本；重复平台、未知平台、无效包或不兼容的跨平台 manifest 会让命令失败，且不会覆盖现有索引。

## 离线安装

在可联网机器下载 `.gtx`，传输到目标机器后，在“扩展”页面选择“离线安装”并填写本地绝对路径。离线安装不访问扩展源，仍会验证包内清单、校验文件、文件数量、解压体积和安全路径。

官方 SFTP 扩展可使用以下命令构建：

```shell
./scripts/package-extension.sh sftp
```

产物位于 `dist/extensions/`。
