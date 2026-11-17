export const LOG_LEVEL: 'info' | 'debug' = 'info'; // Set to 'debug' for verbose logging

export function debug(...args: any[]) {
  if (LOG_LEVEL === 'debug') {
    console.log('[Elden]', ...args);
  }
}
