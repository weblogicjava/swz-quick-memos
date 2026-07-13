import { describe, expect, it } from 'vitest';
import type { QuickMemoRecord } from '../src/types';
import { activeFilterChips, dateRangeForPreset, filterRecordsForView, isSkippableFilterPatch, rollSelectedDate, sortRecordsForDisplay } from '../src/view/viewState';

const records: QuickMemoRecord[] = [
  makeRecord('1', '2026-06-18', '09:00', 'flash', 'idea #a'),
  makeRecord('2', '2026-06-18', '10:00', 'todo', 'task #b', true),
  makeRecord('3', '2026-06-17', '08:00', 'record', 'note #a'),
];

describe('viewState', () => {
  it('filters by date, type, tag, text, and completed state', () => {
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18', type: 'todo', tag: '#b', text: 'task', todoStatus: 'completed' }).map((record) => record.id)).toEqual(['2']);
  });

  it('filters completed todos only when todoStatus is completed', () => {
    const set: QuickMemoRecord[] = [
      makeRecord('open', '2026-06-18', '08:00', 'todo', 'open todo', false),
      makeRecord('done', '2026-06-18', '09:00', 'todo', 'done todo', true),
      makeRecord('note', '2026-06-18', '10:00', 'record', 'plain note'),
    ];
    expect(filterRecordsForView(set, { type: 'todo', todoStatus: 'completed' }).map((record) => record.id)).toEqual(['done']);
  });

  it('ignores selectedDate when filtering by tag, spanning all dates', () => {
    // selectedDate is 2026-06-18, but tag #a also matches 2026-06-17 — both come back.
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18', tag: '#a' }).map((record) => record.id)).toEqual(['1', '3']);
  });

  it('ignores selectedDate when filtering by text, spanning all dates', () => {
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18', text: 'note' }).map((record) => record.id)).toEqual(['3']);
  });

  it('still applies selectedDate when no tag or text filter is set', () => {
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18' }).map((record) => record.id)).toEqual(['1', '2']);
  });

  it('ignores selectedDate when filtering by type, spanning all dates', () => {
    // selectedDate is 2026-06-18, but type 'record' also matches 2026-06-17.
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18', type: 'record' }).map((record) => record.id)).toEqual(['3']);
  });

  it('filters open todos only when todoStatus is open', () => {
    const set: QuickMemoRecord[] = [
      makeRecord('open', '2026-06-18', '08:00', 'todo', 'open todo', false),
      makeRecord('done', '2026-06-18', '09:00', 'todo', 'done todo', true),
      makeRecord('note', '2026-06-18', '10:00', 'record', 'plain note'),
    ];
    expect(filterRecordsForView(set, { type: 'todo', todoStatus: 'open' }).map((record) => record.id)).toEqual(['open']);
  });

  it('computes date range presets', () => {
    expect(dateRangeForPreset('today', '2026-06-18')).toEqual({ startDate: '2026-06-18', endDate: '2026-06-18' });
    expect(dateRangeForPreset('7d', '2026-06-18')).toEqual({ startDate: '2026-06-12', endDate: '2026-06-18' });
  });

  describe('sortRecordsForDisplay', () => {
    const pair: QuickMemoRecord[] = [
      makeRecord('nine', '2026-06-18', '09:00', 'record', 'morning'),
      makeRecord('ten', '2026-06-18', '10:00', 'record', 'later'),
    ];

    it('returns newest first for desc (default)', () => {
      expect(sortRecordsForDisplay(pair, 'desc').map((record) => record.id)).toEqual(['ten', 'nine']);
    });

    it('returns oldest first for asc', () => {
      expect(sortRecordsForDisplay(pair, 'asc').map((record) => record.id)).toEqual(['nine', 'ten']);
    });

    it('does not mutate the input array', () => {
      const copy = [...pair];
      sortRecordsForDisplay(pair, 'desc');
      expect(pair.map((record) => record.id)).toEqual(copy.map((record) => record.id));
    });
  });

  describe('activeFilterChips', () => {
    it('returns no chips when no filters are set', () => {
      expect(activeFilterChips({})).toEqual([]);
    });

    it('ignores selectedDate (it is not a removable query condition)', () => {
      expect(activeFilterChips({ selectedDate: '2026-06-18' })).toEqual([]);
    });

    it('emits a type chip with the localized label that clears type and todoStatus', () => {
      const chips = activeFilterChips({ type: 'flash' });
      expect(chips).toHaveLength(1);
      expect(chips[0]).toMatchObject({ key: 'type', label: '闪念', fullLabel: '闪念' });
      expect(chips[0].clear).toEqual({ type: undefined, todoStatus: undefined });
    });

    it('labels plain todo as 待办', () => {
      expect(activeFilterChips({ type: 'todo' })[0].label).toBe('待办');
    });

    it('labels completed todos as 已完成待办', () => {
      const chips = activeFilterChips({ type: 'todo', todoStatus: 'completed' });
      expect(chips).toHaveLength(1);
      expect(chips[0].label).toBe('已完成待办');
    });

    it('labels open todos as 未完成待办', () => {
      expect(activeFilterChips({ type: 'todo', todoStatus: 'open' })[0].label).toBe('未完成待办');
    });

    it('does not emit a type chip when type is all', () => {
      expect(activeFilterChips({ type: 'all' })).toEqual([]);
    });

    it('emits a tag chip prefixed with # that clears only tag', () => {
      const chips = activeFilterChips({ tag: '#work' });
      expect(chips).toHaveLength(1);
      expect(chips[0]).toMatchObject({ key: 'tag', label: '#work', fullLabel: '#work' });
      expect(chips[0].clear).toEqual({ tag: undefined });
    });

    it('emits a keyword chip prefixed with 关键词： that clears only text', () => {
      const chips = activeFilterChips({ text: 'abc' });
      expect(chips).toHaveLength(1);
      expect(chips[0]).toMatchObject({ key: 'text', label: '关键词：abc', fullLabel: '关键词：abc' });
      expect(chips[0].clear).toEqual({ text: undefined });
    });

    it('ignores a keyword that is only whitespace', () => {
      expect(activeFilterChips({ text: '   ' })).toEqual([]);
    });

    it('orders chips type → tag → keyword and carries the full keyword text', () => {
      const chips = activeFilterChips({ type: 'flash', tag: '#a', text: 'long query' });
      expect(chips.map((chip) => chip.key)).toEqual(['type', 'tag', 'text']);
      expect(chips[2].fullLabel).toBe('关键词：long query');
    });
  });

  describe('isSkippableFilterPatch', () => {
    it('skips a no-op text re-commit (search box Enter/blur firing the same value)', () => {
      expect(isSkippableFilterPatch({ text: 'abc' }, { text: 'abc' })).toBe(true);
    });

    it('applies a real text change', () => {
      expect(isSkippableFilterPatch({ text: 'xyz' }, { text: 'abc' })).toBe(false);
    });

    it('applies clearing the keyword (text -> undefined is a real change)', () => {
      expect(isSkippableFilterPatch({ text: undefined }, { text: 'abc' })).toBe(false);
    });

    it('applies a tag-only patch even when there is no text filter', () => {
      expect(isSkippableFilterPatch({ tag: undefined }, {})).toBe(false);
    });

    it('applies clear-all even when there is no keyword filter', () => {
      const clearAll = { type: undefined, tag: undefined, text: undefined, todoStatus: undefined };
      expect(isSkippableFilterPatch(clearAll, { type: 'flash', tag: '#a' })).toBe(false);
    });

    it('applies a plain type change', () => {
      expect(isSkippableFilterPatch({ type: 'flash', todoStatus: undefined }, {})).toBe(false);
    });
  });

  describe('rollSelectedDate', () => {
    it('returns undefined when the day has not rolled over', () => {
      expect(rollSelectedDate('2026-06-19', '2026-06-19', '2026-06-19')).toBeUndefined();
    });

    it('follows the clock to the new day when the user was on today', () => {
      expect(rollSelectedDate('2026-06-19', '2026-06-19', '2026-06-20')).toBe('2026-06-20');
    });

    it('leaves a historical date untouched across midnight', () => {
      expect(rollSelectedDate('2026-06-10', '2026-06-19', '2026-06-20')).toBeUndefined();
    });
  });
});

function makeRecord(id: string, date: string, time: string, type: QuickMemoRecord['type'], content: string, completed?: boolean): QuickMemoRecord {
  return { id, date, time, type, content, tags: content.match(/#[a-z]/g) ?? [], completed, filePath: `${date}.md`, lineStart: 1, lineEnd: 1, hasStableId: true, raw: content, contentHash: id };
}
