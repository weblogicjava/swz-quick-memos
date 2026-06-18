import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings/settings';

const saved = {
  userName: 'Ada',
  userSlogan: 'Capture ideas fast',
  avatar: 'avatar.png',
  quickMemoHeading: 'Memos',
  overrideDailyNotesConfig: false,
  fallbackDailyNotesFolder: 'Journal',
  fallbackDateFormat: 'YYYY/MM/DD',
  enableBlockIds: false,
  defaultRecordType: 'flash' as const,
  sortDirection: 'asc' as const,
};

describe('settings', () => {
  it('provides defaults required by the spec', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      userName: 'Quick Memo',
      userSlogan: 'Capture the moment.',
      avatar: '',
      quickMemoHeading: 'Quick Memo',
      overrideDailyNotesConfig: true,
      fallbackDailyNotesFolder: '每日工作',
      fallbackDateFormat: 'YYYY/MM/YYYY-MM-DD',
      enableBlockIds: true,
      defaultRecordType: 'flash',
      sortDirection: 'desc',
    });
  });

  it('merges saved settings over defaults', () => {
    expect(normalizeSettings(saved)).toEqual(saved);
  });

  it('repairs invalid enum values', () => {
    const normalized = normalizeSettings({ defaultRecordType: 'idea', sortDirection: 'newest' });
    expect(normalized.defaultRecordType).toBe('flash');
    expect(normalized.sortDirection).toBe('desc');
  });
});
