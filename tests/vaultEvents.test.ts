import { describe, expect, it } from 'vitest';
import { shouldHandleVaultFileEvent } from '../src/vaultEvents';

describe('shouldHandleVaultFileEvent', () => {
  it('only handles Quick Memo markdown files', () => {
    expect(shouldHandleVaultFileEvent('每日工作/2026/06/2026-06-21-quick-memos.md')).toBe(true);
    expect(shouldHandleVaultFileEvent('每日工作/2026/06/2026-06-21.md')).toBe(false);
    expect(shouldHandleVaultFileEvent('Projects/2026-06-21-quick-memos.md')).toBe(true);
    expect(shouldHandleVaultFileEvent('.obsidian/plugins/obsidian-linter/data.json')).toBe(false);
    expect(shouldHandleVaultFileEvent('Notes/random.md')).toBe(false);
  });
});
