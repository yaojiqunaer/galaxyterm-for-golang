import assert from 'node:assert/strict';
import { parseSshConfigProfiles } from './sshConfigProfiles.js';

const sampleConfig = `
# shared defaults are ignored for import safety
Host *
  User ignored

Host prod-api prod-db
  HostName 10.20.30.40
  User deploy
  Port 2222
  IdentityFile ~/.ssh/prod_ed25519

Host *.internal
  HostName ignored.example.com

Host bastion
  User ops

Host agent-host
  HostName agent.example.com
  User deploy
  IdentityAgent ~/.ssh/agent.sock
  ConnectTimeout 40
  ServerAliveInterval 15
  ServerAliveCountMax 4
`;

const profiles = parseSshConfigProfiles(sampleConfig, { idFactory: (name) => `id-${name}` });

assert.equal(profiles.length, 4);
assert.deepEqual(
  profiles.map((profile) => ({
    id: profile.id,
    displayName: profile.displayName,
    host: profile.config.host,
    port: profile.config.port,
    username: profile.auth.username,
    authType: profile.auth.authType,
    agentSocketPath: profile.config.agentSocketPath,
    connectTimeoutSeconds: profile.config.connectTimeoutSeconds,
    keepAliveIntervalSeconds: profile.config.keepAliveIntervalSeconds,
    keepAliveMaxFailures: profile.config.keepAliveMaxFailures,
    identityFile: profile.config.identityFile,
    group: profile.group,
  })),
  [
    {
      id: 'id-prod-api',
      displayName: 'prod-api',
      host: '10.20.30.40',
      port: 2222,
      username: 'deploy',
      authType: 'privateKey',
      agentSocketPath: '',
      connectTimeoutSeconds: 10,
      keepAliveIntervalSeconds: 0,
      keepAliveMaxFailures: 3,
      identityFile: '~/.ssh/prod_ed25519',
      group: 'SSH Config',
    },
    {
      id: 'id-prod-db',
      displayName: 'prod-db',
      host: '10.20.30.40',
      port: 2222,
      username: 'deploy',
      authType: 'privateKey',
      agentSocketPath: '',
      connectTimeoutSeconds: 10,
      keepAliveIntervalSeconds: 0,
      keepAliveMaxFailures: 3,
      identityFile: '~/.ssh/prod_ed25519',
      group: 'SSH Config',
    },
    {
      id: 'id-bastion',
      displayName: 'bastion',
      host: 'bastion',
      port: 22,
      username: 'ops',
      authType: 'password',
      agentSocketPath: '',
      connectTimeoutSeconds: 10,
      keepAliveIntervalSeconds: 0,
      keepAliveMaxFailures: 3,
      identityFile: '',
      group: 'SSH Config',
    },
    {
      id: 'id-agent-host',
      displayName: 'agent-host',
      host: 'agent.example.com',
      port: 22,
      username: 'deploy',
      authType: 'agent',
      agentSocketPath: '~/.ssh/agent.sock',
      connectTimeoutSeconds: 40,
      keepAliveIntervalSeconds: 15,
      keepAliveMaxFailures: 4,
      identityFile: '',
      group: 'SSH Config',
    },
  ],
);

const invalidKeepAlive = parseSshConfigProfiles(`Host short-keepalive
  ServerAliveInterval 3`, { idFactory: (alias) => alias });
assert.equal(invalidKeepAlive[0].config.keepAliveIntervalSeconds, 0);
