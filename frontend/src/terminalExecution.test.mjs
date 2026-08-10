import assert from 'node:assert/strict';
import {
  appendTerminalOutputTail,
  buildCommandCompletionAuditDetail,
  buildTerminalPasteRisk,
  parseShellIntegrationExitCode,
  shouldNotifyTerminalActivity,
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
assert.equal(buildCommandCompletionAuditDetail({ durationMs: 1250, exitCode: 2 }), 'exitCode=2; durationMs=1250');
assert.equal(buildCommandCompletionAuditDetail({ durationMs: 80 }), 'durationMs=80');
assert.equal(buildCommandCompletionAuditDetail({ durationMs: -1, exitCode: 'secret command' }), 'durationMs=0');

assert.equal(buildTerminalPasteRisk('echo hello'), null);
assert.equal(buildTerminalPasteRisk('\r'), null);
assert.equal(buildTerminalPasteRisk('\n'), null);
assert.equal(buildTerminalPasteRisk('\r\n'), null);
assert.deepEqual(buildTerminalPasteRisk('first\nsecond\nthird'), {
  characterCount: 18,
  lineCount: 3,
  reasons: ['multiline'],
});
const sensitivePasteRisk = buildTerminalPasteRisk(`password=super-secret-${'x'.repeat(140)}`);
assert.deepEqual(sensitivePasteRisk, {
  characterCount: 162,
  lineCount: 1,
  reasons: ['large'],
});
assert.equal(JSON.stringify(sensitivePasteRisk).includes('super-secret'), false);
assert.deepEqual(buildTerminalPasteRisk(`${'x'.repeat(121)}\nsecond\nthird`), {
  characterCount: 134,
  lineCount: 3,
  reasons: ['large', 'multiline'],
});

assert.equal(shouldNotifyTerminalActivity(null, 1000, 500), true);
assert.equal(shouldNotifyTerminalActivity(1000, 1499, 500), false);
assert.equal(shouldNotifyTerminalActivity(1000, 1500, 500), true);
assert.equal(shouldNotifyTerminalActivity(1500, 1400, 500), false);

console.log('terminal execution tests passed');
