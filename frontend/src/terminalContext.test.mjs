import assert from 'node:assert/strict';
import {
  mergeTerminalContext,
  normalizeTerminalTitle,
  parseOscWorkingDirectory,
} from './terminalContext.js';

assert.equal(normalizeTerminalTitle('  deploy\u0007\nproduction  '), 'deploy production');
assert.equal(normalizeTerminalTitle('\u001b[31mroot@host\u001b[0m'), 'root@host');
assert.equal(normalizeTerminalTitle('x'.repeat(220)).length, 160);
assert.equal(normalizeTerminalTitle(''), '');

assert.deepEqual(parseOscWorkingDirectory('file://server.example.com/home/dev/My%20Project'), {
  host: 'server.example.com',
  path: '/home/dev/My Project',
});
assert.deepEqual(parseOscWorkingDirectory('file:///Users/dev/work'), {
  host: '',
  path: '/Users/dev/work',
});
assert.equal(parseOscWorkingDirectory('https://example.com/work'), null);
assert.equal(parseOscWorkingDirectory('file://host/%E0%A4%A'), null);
assert.equal(parseOscWorkingDirectory('not a uri'), null);

const initial = { title: '', workingDirectory: null };
const titled = mergeTerminalContext(initial, { title: 'root@host' });
assert.deepEqual(titled, { title: 'root@host', workingDirectory: null });
assert.equal(mergeTerminalContext(titled, { title: 'root@host' }), titled);
const located = mergeTerminalContext(titled, {
  workingDirectory: { host: 'host', path: '/srv/app' },
});
assert.deepEqual(located, {
  title: 'root@host',
  workingDirectory: { host: 'host', path: '/srv/app' },
});
assert.equal(mergeTerminalContext(located, {
  workingDirectory: { host: 'host', path: '/srv/app' },
}), located);

console.log('terminal context tests passed');
