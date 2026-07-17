// @ts-check
// This file follows the Wails generated binding shape.
import { callWails } from '../../../src/desktopBridge.js';

export function List(arg1) {
  return callWails(['files', 'API', 'List'], arg1);
}

export function Mkdir(arg1) {
  return callWails(['files', 'API', 'Mkdir'], arg1);
}

export function Delete(arg1) {
  return callWails(['files', 'API', 'Delete'], arg1);
}

export function Download(arg1, arg2) {
  return callWails(['files', 'API', 'Download'], arg1, arg2);
}

export function DownloadWithID(arg1, arg2, arg3) {
  return callWails(['files', 'API', 'DownloadWithID'], arg1, arg2, arg3);
}

export function ReadFile(arg1) {
  return callWails(['files', 'API', 'ReadFile'], arg1);
}

export function Rename(arg1) {
  return callWails(['files', 'API', 'Rename'], arg1);
}

export function Upload(arg1) {
  return callWails(['files', 'API', 'Upload'], arg1);
}

export function UploadWithID(arg1, arg2) {
  return callWails(['files', 'API', 'UploadWithID'], arg1, arg2);
}

export function CancelTransfer(arg1) {
  return callWails(['files', 'API', 'CancelTransfer'], arg1);
}

export function WriteFile(arg1) {
  return callWails(['files', 'API', 'WriteFile'], arg1);
}
