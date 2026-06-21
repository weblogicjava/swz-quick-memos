import { isQuickMemoPath } from './daily-notes/path';

export function shouldHandleVaultFileEvent(path: string): boolean {
  return isQuickMemoPath(path);
}
