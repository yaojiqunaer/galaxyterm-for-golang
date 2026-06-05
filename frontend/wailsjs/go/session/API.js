// @ts-check
// This file follows the Wails generated binding shape.

export function Close(arg1) {
  return window['go']['session']['API']['Close'](arg1);
}

export function CreateSession(arg1) {
  return window['go']['session']['API']['CreateSession'](arg1);
}

export function ListProviders() {
  return window['go']['session']['API']['ListProviders']();
}

export function ListSessions() {
  return window['go']['session']['API']['ListSessions']();
}

export function Resize(arg1, arg2, arg3) {
  return window['go']['session']['API']['Resize'](arg1, arg2, arg3);
}

export function Send(arg1, arg2) {
  return window['go']['session']['API']['Send'](arg1, arg2);
}
