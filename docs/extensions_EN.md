# GalaxyTerm Extension Distribution

English | [简体中文](extensions.md)

The GalaxyTerm core includes local terminals and SSH. SFTP, FTP/FTPS, S3, Kubernetes, Docker, databases, and other terminal or file protocols are distributed as `.gtx` extensions.

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

GalaxyTerm uses native operating-system open/save dialogs. Cancellation does not invoke the provider. Downloads are staged first and committed to the selected destination only after the provider completes. FTP, S3, WebDAV, and future extensions can reuse the same operations without protocol-specific UI.

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
        "version": "0.2.0",
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
          "url": "galaxyterm-extension-sftp_0.2.0_darwin_arm64.gtx",
          "sha256": "<64-character hexadecimal SHA-256>"
        },
        {
          "os": "linux",
          "arch": "amd64",
          "url": "galaxyterm-extension-sftp_0.2.0_linux_amd64.gtx",
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

Download a `.gtx` package on a connected machine, transfer it to the target device, then choose Offline Install on the Extensions page and enter its absolute local path. Offline installation does not access extension sources and still verifies the manifest, checksum file, file count, extracted size, and archive paths.

Build the official SFTP extension with:

```shell
./scripts/package-extension.sh sftp
```

Packages are written to `dist/extensions/`.
