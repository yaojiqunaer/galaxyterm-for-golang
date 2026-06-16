# Security Policy

## Credential Storage

GalaxyTerm does not store SSH passwords, private keys, passphrases, or jump-host passwords in profile JSON, workspace snapshots, recent connections, audit exports, or recording exports.

When users enable credential saving, secrets are stored through the operating system credential store:

- macOS Keychain
- Windows Credential Manager
- Linux Secret Service compatible keyrings

Connection profiles keep only a credential reference. Exported profiles omit the secret values.

## Audit and Recording Data

Audit logs record session lifecycle events, operation summaries, and terminal output recordings. Exports apply basic redaction for common passwords, tokens, Authorization headers, and private key blocks.

## Reporting Vulnerabilities

Please report security issues through a private GitHub security advisory or by contacting the maintainer privately. Do not open a public issue with exploitable details.
