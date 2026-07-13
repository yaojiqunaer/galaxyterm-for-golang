const barePromptPattern = /^(?:[$#%>]|❯|➜|λ)[ \t]+$/;
const promptSuffixPattern = /(?:[$#%>]|❯|➜|λ)[ \t]+$/;
const promptContextPattern = /(?:@|[~/:\\]|\b(?:mysql|mariadb|redis|psql|postgres|powershell|PS)\b)/i;

export function buildTerminalPasteRisk(data = '') {
  const value = String(data || '');
  if (!value) return null;
  const lineBreakCount = (value.match(/\r\n|\r|\n/g) || []).length;
  const reasons = [];
  if (value.length > 120) reasons.push('large');
  if (lineBreakCount > 0) reasons.push('multiline');
  if (reasons.length === 0) return null;
  return {
    characterCount: value.length,
    lineCount: lineBreakCount + 1,
    reasons,
  };
}

export function appendTerminalOutputTail(current = '', output = '', limit = 512) {
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 512));
  return `${current || ''}${output || ''}`.slice(-safeLimit);
}

export function terminalOutputIndicatesPrompt(output = '') {
  const normalized = stripTerminalControlSequences(output).replace(/\r/g, '');
  const lastLine = normalized.split('\n').at(-1) || '';
  if (barePromptPattern.test(lastLine)) return true;
  return promptSuffixPattern.test(lastLine) && promptContextPattern.test(lastLine);
}

export function parseShellIntegrationExitCode(output = '') {
  const matches = [...String(output || '').matchAll(/\u001b\]133;D;(-?\d+)(?:\u0007|\u001b\\)/g)];
  if (matches.length === 0) return null;
  const exitCode = Number(matches[matches.length - 1][1]);
  return Number.isSafeInteger(exitCode) ? exitCode : null;
}

function stripTerminalControlSequences(value = '') {
  return String(value)
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}
