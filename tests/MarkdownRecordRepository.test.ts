import { describe, expect, it } from 'vitest';
import { DailyNoteResolver } from '../src/daily-notes/DailyNoteResolver';
import { MarkdownRecordRepository } from '../src/markdown/MarkdownRecordRepository';
import { QuickMemoParser } from '../src/markdown/QuickMemoParser';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import { FakeVault } from '../src/test/fakeVault';

describe('MarkdownRecordRepository', () => {
  it('appends records to the Quick Memo section', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '# Day\n\n## Quick Memo\n' });
    const repo = makeRepo(vault);
    await repo.appendRecord({ date: '2026-06-18', time: '09:12', type: 'flash', content: 'idea #tag', body: 'line 2' }, 'a1b2');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 09:12 [闪念] idea #tag ^oqm-20260618-091200-a1b2\n  line 2');
  });

  it('respects pure markdown mode when block ids are disabled', async () => {
    const vault = new FakeVault();
    const settings = { ...DEFAULT_SETTINGS, enableBlockIds: false };
    const repo = makeRepo(vault, settings);
    await repo.appendRecord({ date: '2026-06-18', time: '10:00', type: 'record', content: 'plain' }, 'a1b2');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 10:00 [记录] plain');
    expect(await vault.read('Daily Notes/2026-06-18.md')).not.toContain('^oqm-');
  });

  it('toggles todo completion by stable id', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- [ ] 10:20 [待办] task #todo ^oqm-20260618-102000-e5f6\n' });
    const repo = makeRepo(vault);
    await repo.toggleTodo('oqm-20260618-102000-e5f6');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- [x] 10:20 [待办] task #todo ^oqm-20260618-102000-e5f6');
  });

  it('updates record content and preserves time and id', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- 09:12 [闪念] old ^oqm-20260618-091200-a1b2\n' });
    const repo = makeRepo(vault);
    await repo.updateRecord('oqm-20260618-091200-a1b2', { type: 'record', content: 'new #tag', body: 'body' });
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 09:12 [记录] new #tag ^oqm-20260618-091200-a1b2\n  body');
  });

  it('deletes a record and its indented body', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- 09:12 [闪念] remove ^oqm-20260618-091200-a1b2\n  body\n- 10:00 [记录] keep ^oqm-20260618-100000-b2\n' });
    const repo = makeRepo(vault);
    await repo.deleteRecord('oqm-20260618-091200-a1b2');
    const content = await vault.read('Daily Notes/2026-06-18.md');
    expect(content).not.toContain('remove');
    expect(content).toContain('keep');
  });
});

function makeRepo(vault: FakeVault, settings = DEFAULT_SETTINGS): MarkdownRecordRepository {
  const resolver = new DailyNoteResolver(vault, undefined, settings);
  return new MarkdownRecordRepository(vault, resolver, new QuickMemoParser(settings.quickMemoHeading), settings);
}
