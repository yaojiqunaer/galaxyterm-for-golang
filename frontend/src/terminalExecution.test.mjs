import assert from 'node:assert/strict';
import {
  appendTerminalOutputTail,
  parseShellIntegrationExitCode,
  terminalOutputIndicatesPrompt,
} from './terminalExecution.js';

assert.equal(terminalOutputIndicatesPrompt('building...\r\nstep 2/4\r\n'), false);
assert.equal(terminalOutputIndicatesPrompt('user@host repo % '), true);
assert.equal(terminalOutputIndicatesPrompt('root@host:/srv# '), true);
assert.equal(terminalOutputIndicatesPrompt('mysql> '), true);
assert.equal(terminalOutputIndicatesPrompt('127.0.0.1:6379> '), true);
assert.equal(terminalOutputIndicatesPrompt('postgres=# '), true);
assert.equal(terminalOutputIndicatesPrompt('PS C:\\workspace> '), true);
assert.equal(terminalOutputIndicatesPrompt('\u001b[32muser@host\u001b[0m $ '), true);
assert.equal(terminalOutputIndicatesPrompt('price is 20%'), false);
assert.equal(terminalOutputIndicatesPrompt('Downloading 20% '), false);
assert.equal(terminalOutputIndicatesPrompt('% '), true);

const tail = appendTerminalOutputTail('old\r\n', 'new output', 10);
assert.equal(tail, 'new output');
assert.equal(appendTerminalOutputTail('abc', 'def', 20), 'abcdef');

assert.equal(parseShellIntegrationExitCode('\u001b]133;D;0\u0007'), 0);
assert.equal(parseShellIntegrationExitCode('\u001b]133;D;127\u001b\\'), 127);
assert.equal(parseShellIntegrationExitCode('plain terminal output'), null);

console.log('terminal execution tests passed');
