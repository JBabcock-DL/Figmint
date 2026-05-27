/** Figma's QuickJS main-thread console has log/warn/error/info — not debug. */
export function pluginLog(message?: unknown, ...optionalParams: unknown[]): void {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(message, ...optionalParams);
  }
}
