# GalaxyTerm 扩展分发

[English](extensions_EN.md) | 简体中文

GalaxyTerm 核心包内置本地终端与 SSH。SFTP、FTP/FTPS、S3、Kubernetes、Docker、数据库及其他终端或文件协议通过 `.gtx` 扩展分发。

## 交互式终端 Provider

终端扩展在 `providers` 中声明类型，并提供 `stdio-json-v1` 可执行入口。安装或卸载后，GalaxyTerm 会立即刷新可用 Provider，无需重启；刷新不会关闭已经打开的会话。没有 `runtime` 的旧清单仍可安装和展示，但不会注册为可创建会话的终端 Provider。

```json
{
  "id": "galaxyterm-extension-redis",
  "name": "Redis",
  "version": "0.1.0",
  "apiVersion": "v1",
  "runtime": {
    "protocol": "stdio-json-v1",
    "entrypoint": "bin/galaxyterm-extension-redis"
  },
  "providers": [
    {
      "type": "redis",
      "nameKey": "extension.redis.name",
      "description": "Interactive Redis terminal",
      "capabilities": ["stream", "resize"],
      "configFields": [
        {"key":"host","label":"Host","type":"string","required":true,"default":"127.0.0.1"},
        {"key":"port","label":"Port","type":"number","required":true,"default":6379,"min":1,"max":65535}
      ],
      "authFields": [
        {"key":"password","label":"Password","type":"password"}
      ]
    }
  ],
  "locales": ["zh-CN", "en-US"]
}
```

`configFields` 和 `authFields` 使用与文件 Provider 相同的 `string`、`textarea`、`number`、`boolean`、`select`、`password` 字段模型。核心根据清单生成连接表单；配置进入保存连接，认证值仅在用户选择保存时写入系统凭据库，档案、导出和工作区快照都不保存明文。

连接表单的“测试连接”会用当前配置启动一个临时 Driver，成功建立后立即关闭。探测不会创建标签或活动会话，也不会写入审计和录屏记录；默认 20 秒超时，失败时沿用统一的结构化错误和重试提示。保存连接引用了系统凭据时，测试会先解析凭据，但不会把密钥回写到表单；用户本次明确输入的非空认证值优先于已保存值。

## 扩展多语言资源

扩展可在 `locales` 中声明语言，并把对应 JSON 词典放在 `.gtx` 的 `locales/<语言>.json`。清单中的 `nameKey`、字段 `labelKey`、`placeholderKey` 和选项 `labelKey` 都会使用当前语言解析；切换语言以及安装、更新或卸载扩展后立即刷新，无需重启，也不会重建活动会话。

```json
{
  "extension.redis.name": "Redis 交互终端",
  "extension.redis.field.database": "数据库"
}
```

每个键必须位于当前 Provider 的 `extension.<providerType>` 命名空间，例如 Redis Provider 只能提供 `extension.redis` 或 `extension.redis.*`。扩展不能覆盖导航、安全提示等核心文案；重复键、非字符串值、越界命名空间、超大词典或超长文案会使安装失败。每个词典最多 256 KiB、512 条文案，单条最多 4096 字节。

为兼容已发布扩展，客户端允许旧包只声明 `locales` 而不包含词典文件，此时继续使用核心词典、清单中的英文文案或键名回退。官方打包工具要求每个已声明语言都有对应文件，并将词典纳入 `checksums.txt`。

GalaxyTerm 为每个终端会话启动一个独立 sidecar 进程，以换行分隔的 JSON 帧通过标准输入输出通信。认证信息只出现在 `create` 请求的标准输入中，不进入命令行参数或环境变量。每个请求都必须返回相同 `requestId` 的 `response`；输出单帧上限为 16 MiB。

```json
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"create","config":{"host":"127.0.0.1","port":6379},"auth":{"password":"..."}}
{"type":"response","requestId":"..."}
{"type":"event","event":"data","data":"127.0.0.1:6379> "}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"send","data":"PING\r"}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"resize","cols":120,"rows":40}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"close"}
```

事件可使用 `data`、`status`、`error`、`exit` 和 `log`。`error` 携带 `code`、可选 `messageKey`、`defaultMessage` 与 `details`；`log` 不写入终端，以免扩展日志泄露凭据。`send` 应在接收输入后尽快响应，耗时的远程命令通过后续事件异步输出。`close` 应释放远程连接并正常退出。宿主会限制启动和操作等待时间，遇到非法帧、超大帧或无法退出的进程时终止当前 sidecar，不影响其他会话。

## 文件 Provider 能力

远程文件工作区只根据 `fileProviders[].capabilities` 展示可用操作，不包含协议专用分支。`list` 控制目录浏览，`read`、`write` 控制受限文本查看与编辑，`upload`、`download` 控制原生流式传输，`mkdir`、`rename`、`delete` 分别控制新建目录、重命名和删除。只有 `read` 而没有 `write` 时，文件以只读方式打开；删除操作默认需要二次确认。传输能力必须显式声明，旧版只支持文本读写的扩展不会收到新增操作。

所有文件 Provider 自动获得当前目录名称/路径搜索、目录优先排序，以及按名称、最近修改、大小切换排序的统一浏览体验。

FTP、S3、WebDAV 等新协议只需实现 `stdio-json-v1` 操作并声明真实能力，无需修改核心文件列表。对象存储不支持的操作应从 manifest 中省略，界面会自动隐藏对应入口。

## 二进制传输协议

文本查看与编辑继续使用 `read`、`write` 和受限的 JSON `content` 字段。常规文件上传、下载使用独立的流式操作，二进制内容不会进入 WebView 或单条 JSON 消息：

- `upload` 需要 Provider 显式声明 `upload` 能力。`path` 是远程目标，`localPath` 是宿主创建并填充的私有临时文件绝对路径。
- `download` 需要 Provider 显式声明 `download` 能力。`path` 是远程来源，`localPath` 是宿主预创建的私有临时文件绝对路径。
- Provider 必须使用有界缓冲流式复制，不得把文件内容写入响应；完成后只返回空结果或传输元数据。
- `localPath` 只在当前请求中使用，不得保存、记录或当作用户配置。宿主会在成功、失败和取消后清理临时目录。
- 支持进度的宿主会在请求中发送 `"features":["transfer-progress-v1"]`。Provider 可在最终响应前逐行发送 `{"type":"progress","requestId":"...","progress":{"bytes":131072,"total":1048576}}`；每帧必须使用当前 `requestId`，`bytes` 必须单调递增。
- 未声明 `transfer-progress-v1` 时，Provider 只能输出一个最终 JSON 响应。这样新版扩展仍能在旧版 GalaxyTerm 中运行；新版 GalaxyTerm 同样接受只返回最终响应的旧扩展。

GalaxyTerm 使用系统原生打开/保存对话框。用户在文件对话框中取消时不会调用 Provider；运行中的传输可从进度条取消。下载先写入临时文件，完整成功后才提交到用户选择的位置。FTP、S3、WebDAV 等扩展可复用同一操作，无需新增协议专用 UI。

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

扩展页可按名称、扩展 ID、终端 Provider、文件 Provider、能力或扩展源状态搜索，并可切换“全部”“可安装”“已安装”“扩展源”范围。保存连接引用了尚未安装或已停用的 Provider 时，连接主操作会显示“查找扩展”，进入扩展页后自动以该 Provider 类型过滤；启用或安装完成后可直接返回连接页面使用原配置。

已安装扩展会显示当前引用它的保存连接数和活动会话数。停用一个正在使用的扩展前会明确提示影响范围；已有终端会话保持打开，但重新启用前不能创建新会话。卸载扩展时会再次提示连接和会话影响，活动会话可能中断；保存连接不会被删除，重新安装相同 Provider 后仍可继续使用。

活动终端的状态栏始终显示 Provider 运行来源。核心终端标记为“核心”；扩展终端显示扩展已启用、已停用或缺失。停用不会强制关闭已有会话，卸载后的会话也会保留到用户关闭，但重新连接前必须重新启用或安装扩展。点击扩展状态会打开扩展页面并自动按扩展 ID 或 Provider 类型筛选；审计和录屏状态可直接打开当前会话记录。

SFTP Provider 复用已保存 SSH 连接的密码、私钥或 SSH Agent 认证，以及主机密钥策略和 Known Hosts 路径。macOS/Linux 上的 Agent Socket 留空时读取 `SSH_AUTH_SOCK`，私钥不会进入 GalaxyTerm；默认首次记录主机密钥，之后拒绝密钥变化，严格模式只接受文件中已有的主机。非 SFTP 文件 Provider 的当前位置可保存为文件连接，并与终端连接一起出现在连接管理、分组、收藏、搜索和命令面板中。`configFields` 保存到连接档案，`authFields` 只写入系统凭据库；连接导入和导出都会移除凭据引用，避免在另一台设备上误显示为“凭据已保存”。未保存凭据的文件连接打开后会停留在认证表单，由用户输入一次性凭据。

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
        "version": "0.4.0",
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
            "capabilities": ["list", "stat", "read", "write", "upload", "download", "mkdir", "rename", "delete"],
            "authMethods": ["password", "privateKey", "agent"]
          }
        ],
        "locales": ["zh-CN", "en-US"]
      },
      "assets": [
        {
          "os": "darwin",
          "arch": "arm64",
          "url": "galaxyterm-extension-sftp_0.4.0_darwin_arm64.gtx",
          "sha256": "<64 位十六进制 SHA-256>"
        },
        {
          "os": "linux",
          "arch": "amd64",
          "url": "galaxyterm-extension-sftp_0.4.0_linux_amd64.gtx",
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

在可联网机器下载 `.gtx`，传输到目标机器后，在“扩展”页面选择“离线安装”，再通过系统文件选择器打开扩展包。取消选择不会改变现有扩展；离线安装不访问扩展源，仍会验证包内清单、校验文件、文件数量、解压体积和安全路径。

官方 SFTP 扩展可使用以下命令构建：

```shell
./scripts/package-extension.sh sftp
```

产物位于 `dist/extensions/`。
