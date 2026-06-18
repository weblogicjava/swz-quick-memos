import { describe, expect, it } from 'vitest';
import type { QuickMemoRecord } from '../src/types';
import { dateRangeForPreset, filterRecordsForView } from '../src/view/viewState';

const records: QuickMemoRecord[] = [
  makeRecord('1', '2026-06-18', '09:00', 'flash', 'idea #a'),
  makeRecord('2', '2026-06-18', '10:00', 'todo', 'task #b', true),
  makeRecord('3', '2026-06-17', '08:00', 'record', 'note #a'),
];

describe('viewState', () => {
  it('filters by date, type, tag, text, and completed state', () => {
    expect(filterRecordsForView(records, { selectedDate: '2026-06-18', type: 'todo', tag: '#b', text: 'task', todoStatus: 'completed' }).map((record) => record.id)).toEqual(['2']);
  });

  it('computes date range presets', () => {
    expect(dateRangeForPreset('today', '2026-06-18')).toEqual({ startDate: '2026-06-18', endDate: '2026-06-18' });
    expect(dateRangeForPreset('7d', '2026-06-18')).toEqual({ startDate: '2026-06-12', endDate: '2026-06-18' });
  });
});

function makeRecord(id: string, date: string, time: string, type: QuickMemoRecord['type'], content: string, completed?: boolean): QuickMemoRecord {
  return { id, date, time, type, content, tags: content.match(/#[a-z]/g) ?? [], completed, filePath: `${date}.md`, lineStart: 1, lineEnd: 1, hasStableId: true, raw: content, contentHash: id };
}
