/** Filename suffix that keeps Quick Memo files separate from the user's regular
 *  daily notes, so the plugin never writes into a plain `yyyy-MM-dd.md`. */
export const QUICK_MEMO_FILENAME_SUFFIX = '-quick-memos';

/**
 * Extract the YYYY-MM-DD date from a daily-note-style path. Accepts both the
 * plugin's own `yyyy-MM-dd-quick-memos.md` and a plain `yyyy-MM-dd.md` (with or
 * without nested `YYYY/MM/` folders), so pre-existing files keep parsing. Files
 * that don't look like a daily note fall back to the epoch sentinel.
 */
export function dateFromPath(path: string): string {
  const suffix = escapeRegExp(QUICK_MEMO_FILENAME_SUFFIX);
  const match = path.match(new RegExp(`([0-9]{4})[-/]([0-9]{2})[-/]([0-9]{2})(?:${suffix})?\\.md$`, 'u'));
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '1970-01-01';
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
