import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings/settings';
import { quickMemoSettingDefinitions } from '../src/settings/settingDefinitions';

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
  deletedTags: ['#archived'],
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
      deletedTags: [],
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

  it('normalizes deletedTags to a deduped string array', () => {
    expect(normalizeSettings({}).deletedTags).toEqual([]);
    expect(normalizeSettings({ deletedTags: ['#a', '#b', '#a', 5, ''] }).deletedTags).toEqual(['#a', '#b']);
    expect(normalizeSettings({ deletedTags: 'not-an-array' }).deletedTags).toEqual([]);
  });
});

// Drives the declarative settings API (Obsidian 1.13.0+). display() is the
// <1.13.0 fallback; these definitions must stay in sync with it and with the
// QuickMemoSettings shape so search + declarative render match the imperative UI.
describe('quickMemoSettingDefinitions', () => {
  type ControlDef = { key: string; type: string; options?: Record<string, string> };
  // Every definition returned is a control definition (see settingDefinitions.ts);
  // cast to read `control`. The "one control per key" assertion below catches any
  // drift if a new *scalar* setting is introduced without a matching control.
  // `deletedTags` is the exception: it is a list managed via a SettingDefinitionAction
  // in SettingsTab (a "管理已删除标签" button + modal), not a scalar control, so it
  // is excluded from the control/key parity check.
  const controls: ControlDef[] = (quickMemoSettingDefinitions() as ReadonlyArray<{ control: ControlDef }>)
    .map((d) => d.control);

  it('defines exactly one control per scalar QuickMemoSettings key', () => {
    const scalarKeys = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== 'deletedTags');
    expect(controls.map((c) => c.key).sort()).toEqual(scalarKeys.sort());
  });

  it('uses toggle for booleans, dropdown for enums, text for the rest', () => {
    const byKey = new Map(controls.map((c) => [c.key, c.type]));
    expect(byKey.get('overrideDailyNotesConfig')).toBe('toggle');
    expect(byKey.get('enableBlockIds')).toBe('toggle');
    expect(byKey.get('defaultRecordType')).toBe('dropdown');
    expect(byKey.get('sortDirection')).toBe('dropdown');
    for (const textKey of ['userName', 'userSlogan', 'avatar', 'quickMemoHeading', 'fallbackDailyNotesFolder', 'fallbackDateFormat']) {
      expect(byKey.get(textKey)).toBe('text');
    }
  });

  it('exposes dropdown options matching the imperative UI', () => {
    const byKey = new Map(controls.map((c) => [c.key, c]));
    expect(byKey.get('defaultRecordType')?.options).toEqual({ record: '记录', flash: '闪念', todo: '待办' });
    expect(byKey.get('sortDirection')?.options).toEqual({ desc: '最新在上', asc: '最早在上' });
  });
});
