# GalaxyTerm SFTP Extension

The official SFTP file provider. It runs through GalaxyTerm's `stdio-json-v1` file protocol, keeping SFTP and SSH dependencies out of the GalaxyTerm core executable.

## Capabilities

- Directory listing, file metadata, and text read/write
- Stream binary and large-file uploads/downloads through host-owned private staging files
- Negotiate real byte progress with hosts that advertise `transfer-progress-v1`; older hosts still receive one compatible response
- Let GalaxyTerm cancel active transfers while always cleaning host-owned staging files
- Stage uploads beside the remote target and rename only after a complete write, avoiding partial destination files after interruption
- Create directories, rename entries, and delete files or empty directories
- Password and private-key authentication
- Reuse saved GalaxyTerm SSH connections and system credential references
- TOFU host-key verification by default: the first key is recorded and later changes are rejected

## Build

Run from the repository root:

```shell
./scripts/package-extension.sh sftp
```

The `.gtx` package is written to `dist/extensions/` and can be installed offline from GalaxyTerm's Extensions page.
