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
      identityFile: '',
      group: 'SSH Config',
    },
  ],
);
