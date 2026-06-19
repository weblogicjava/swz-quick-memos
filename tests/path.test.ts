import { describe, expect, it } from 'vitest';
import { dateFromPath, QUICK_MEMO_FILENAME_SUFFIX } from '../src/daily-notes/path';

describe('dateFromPath', () => {
  it('parses the plugin\'s own -quick-memos files (nested folders)', () => {
    expect(dateFromPath(`每日工作/2026/06/2026-06-19${QUICK_MEMO_FILENAME_SUFFIX}.md`)).toBe('2026-06-19');
  });

  it('parses flat -quick-memos files', () => {
    expect(dateFromPath(`Daily Notes/2026-06-18${QUICK_MEMO_FILENAME_SUFFIX}.md`)).toBe('2026-06-18');
  });

  it('still parses legacy plain yyyy-MM-dd.md files so existing records survive', () => {
    expect(dateFromPath('每日工作/2026/06/2026-06-19.md')).toBe('2026-06-19');
    expect(dateFromPath('Daily Notes/2026-06-18.md')).toBe('2026-06-18');
  });

  it('returns a sentinel for non-daily-note files', () => {
    expect(dateFromPath('Notes/random.md')).toBe('1970-01-01');
  });
});
