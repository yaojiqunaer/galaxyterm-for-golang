# GalaxyTerm Extension Distribution

English | [简体中文](extensions.md)

The GalaxyTerm core includes local terminals and SSH. SFTP, FTP/FTPS, S3, Kubernetes, Docker, databases, and other terminal or file protocols are distributed as `.gtx` extensions.

## Interactive Terminal Providers

A terminal extension declares types in `providers` and ships a `stdio-json-v1` executable entrypoint. GalaxyTerm refreshes providers immediately after installation or removal without an application restart, and refreshing never closes an existing session. Legacy manifests without `runtime` remain installable and visible but are not registered as runnable terminal providers.

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

`configFields` and `authFields` use the same `string`, `textarea`, `number`, `boolean`, `select`, and `password` field model as file providers. The core renders the connection form from the manifest. Configuration enters the saved profile, while authentication values go to the system credential store only when the user opts in; profiles, exports, and workspace snapshots never contain plaintext secrets.

GalaxyTerm starts one isolated sidecar process per terminal session and exchanges newline-delimited JSON frames over standard input and output. Authentication values only appear in the `create` request on standard input; they are never command-line arguments or environment variables. Every request must receive a `response` with the same `requestId`. A single output frame is limited to 16 MiB.

```json
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"create","config":{"host":"127.0.0.1","port":6379},"auth":{"password":"..."}}
{"type":"response","requestId":"..."}
{"type":"event","event":"data","data":"127.0.0.1:6379> "}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"send","data":"PING\r"}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"resize","cols":120,"rows":40}
{"apiVersion":"v1","type":"request","requestId":"...","providerType":"redis","operation":"close"}
```

Supported events are `data`, `status`, `error`, `exit`, and `log`. An `error` contains `code`, optional `messageKey`, `defaultMessage`, and `details`. Provider `log` events never enter the terminal stream so extension diagnostics cannot accidentally expose credentials. `send` should acknowledge accepted input promptly and deliver long-running remote command output through later events. `close` should release the remote connection and exit normally. The host bounds startup and operation waits and terminates only the affected sidecar after an invalid frame, oversized frame, or shutdown timeout.

## File Provider Capabilities

The remote-file workspace derives every available action from `fileProviders[].capabilities`; it contains no protocol-specific action branches. `list` enables directory browsing; `read` and `write` control size-limited text viewing and editing; `upload` and `download` control native streamed transfers; and `mkdir`, `rename`, and `delete` control their matching operations. A provider with `read` but no `write` opens files read-only. Delete actions require confirmation by default. Transfer capabilities must be declared explicitly, so older text-only providers never receive the new operations.

Every file provider automatically receives current-directory name/path search, directory-first ordering, and Name, Recently modified, and Size sort modes.

New FTP, S3, WebDAV, and similar providers only implement the `stdio-json-v1` operations and declare their actual capabilities. They do not modify the core file list. Object-store operations that are not supported should be omitted from the manifest so the corresponding UI stays hidden.

## Binary Transfer Contract

Text viewing and editing continue to use `read`, `write`, and the size-limited JSON `content` field. Regular uploads and downloads use separate streamed operations, so binary content never enters the WebView or a single JSON message:

- `upload` requires an explicit `upload` capability. `path` is the remote destination and `localPath` is the absolute path of a private temporary file staged by the host.
- `download` requires an explicit `download` capability. `path` is the remote source and `localPath` is the absolute path of a private temporary file created by the host.
- Providers must copy with a bounded streaming buffer and must not place file content in the response. Return an empty result or transfer metadata only.
- `localPath` is scoped to one request. Providers must not persist or log it as user configuration. The host removes its temporary directory after success, failure, or cancellation.
- A progress-capable host sends `"features":["transfer-progress-v1"]`. Before the final response, a provider may emit newline-delimited frames such as `{"type":"progress","requestId":"...","progress":{"bytes":131072,"total":1048576}}`. Every frame must use the current `requestId`, and `bytes` must increase monotonically.
- Without `transfer-progress-v1`, a provider must emit one final JSON response only. This keeps new extensions compatible with older GalaxyTerm releases, while new releases continue to accept legacy providers with no progress frames.

GalaxyTerm uses native operating-system open/save dialogs. Canceling a file dialog does not invoke the provider; an active transfer can be canceled from its progress bar. Downloads are staged first and committed to the selected destination only after the provider completes. FTP, S3, WebDAV, and future extensions can reuse the same operations without protocol-specific UI.

## Online Installation

Add one of these HTTPS locations on the Extensions page:

- GitHub repository: `https://github.com/<owner>/<repo>`
- GitHub Releases: `https://github.com/<owner>/<repo>/releases`
- Direct index: `https://example.com/galaxyterm-index.json`

GitHub repository and Releases URLs resolve to:

```text
https://github.com/<owner>/<repo>/releases/latest/download/galaxyterm-index.json
```

After refreshing a source, GalaxyTerm only shows extensions compatible with the current operating system and CPU architecture. Online installation and updates enforce download size limits, verify the index SHA-256, read the package `manifest.json`, and then run the same manifest, path, and package integrity checks used by offline installation.

The Extensions page searches by name, extension ID, terminal provider, file provider, capability, or source status, with All, Available, Installed, and Sources scopes. When a saved connection references a missing or disabled provider, its primary action becomes Find extension and opens this page filtered by that provider type. After installing or enabling it, the original connection configuration remains ready to use.

Installed extensions show how many saved connections and active sessions currently use their providers. Disabling an extension in use presents the exact impact first. Existing terminal sessions remain open, but new sessions cannot start until the extension is enabled again. Uninstall confirmation repeats the connection and session impact because active sessions may be interrupted; saved connections are retained and become usable again after reinstalling the same provider.

The active terminal status rail always identifies the provider runtime source. Core terminals are marked Core; extension terminals report enabled, disabled, or missing state. Disabling does not force an existing session to close, and a session whose extension was removed remains available until the user closes it, but reconnecting requires the extension to be enabled or installed again. Selecting the extension state opens Extensions with the extension ID or provider type already filtered. Audit and recording states open the current session record directly.

The current location of a non-SFTP file provider can be saved as a file connection and appears alongside terminal connections in groups, favorites, search, and the command palette. `configFields` are stored in the profile, while `authFields` are written only to the system credential store. Import and export remove credential references so another device never presents an unavailable secret as saved. Opening a file connection without a stored credential stops at its authentication form for one-time input.

## Release Index

Upload `.gtx` packages and an index named `galaxyterm-index.json` to each Release. Relative URLs resolve against the index location, so the index and packages can be assets of the same GitHub Release:

```json
{
  "apiVersion": "v1",
  "extensions": [
    {
      "manifest": {
        "id": "galaxyterm-extension-sftp",
        "name": "SFTP",
        "version": "0.3.0",
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
            "authMethods": ["password", "privateKey"]
          }
        ],
        "locales": ["zh-CN", "en-US"]
      },
      "assets": [
        {
          "os": "darwin",
          "arch": "arm64",
          "url": "galaxyterm-extension-sftp_0.3.0_darwin_arm64.gtx",
          "sha256": "<64-character hexadecimal SHA-256>"
        },
        {
          "os": "linux",
          "arch": "amd64",
          "url": "galaxyterm-extension-sftp_0.3.0_linux_amd64.gtx",
          "sha256": "<64-character hexadecimal SHA-256>"
        }
      ]
    }
  ]
}
```

`manifest` must match the `manifest.json` inside each corresponding `.gtx` package. Every current-platform asset requires an HTTPS or relative `.gtx` URL and the SHA-256 of the complete file. Use `all` for platform-independent `os` or `arch` values; exact platform assets take precedence over generic assets. An asset may include a `manifest` override when runtime metadata differs by platform; the official generator handles Windows `.exe` entrypoints automatically.

Read every `.gtx` package from `dist/extensions/`, calculate checksums, and generate a stably ordered index with:

```shell
./scripts/generate-extension-index.sh
```

The default output is `dist/extensions/galaxyterm-index.json` with package URLs relative to the index. Generate absolute URLs with:

```shell
./scripts/generate-extension-index.sh \
  -base-url https://github.com/<owner>/<repo>/releases/download/<tag>/
```

Packages in one directory must use `<extension-id>_<version>_<os>_<arch>.gtx`. Each extension may have only one version. Duplicate platforms, unknown targets, invalid packages, or incompatible cross-platform manifests fail without replacing the existing index.

## Offline Installation

Download a `.gtx` package on a connected machine, transfer it to the target device, then choose Offline Install on the Extensions page and open the package with the native file picker. Canceling the picker leaves installed extensions unchanged. Offline installation does not access extension sources and still verifies the manifest, checksum file, file count, extracted size, and archive paths.

Build the official SFTP extension with:

```shell
./scripts/package-extension.sh sftp
```

Packages are written to `dist/extensions/`.
