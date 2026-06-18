import type { QuickMemoSettings, QuickMemoType, SortDirection } from '../types';
import { DEFAULT_QUICK_MEMO_HEADING } from '../constants';

export const DEFAULT_SETTINGS: QuickMemoSettings = {
  userName: 'Quick Memo',
  userSlogan: 'Capture the moment.',
  avatar: '',
  quickMemoHeading: DEFAULT_QUICK_MEMO_HEADING,
  fallbackDailyNotesFolder: 'Daily Notes',
  fallbackDateFormat: 'YYYY-MM-DD',
  enableBlockIds: true,
  defaultRecordType: 'flash',
  sortDirection: 'desc',
};

const VALID_TYPES: QuickMemoType[] = ['record', 'flash', 'todo'];
const VALID_SORTS: SortDirection[] = ['asc', 'desc'];

export function normalizeSettings(raw: unknown): QuickMemoSettings {
  const value = isObject(raw) ? raw : {};
  const merged = { ...DEFAULT_SETTINGS, ...value } as QuickMemoSettings;

  if (!VALID_TYPES.includes(merged.defaultRecordType)) {
    merged.defaultRecordType = DEFAULT_SETTINGS.defaultRecordType;
  }

  if (!VALID_SORTS.includes(merged.sortDirection)) {
    merged.sortDirection = DEFAULT_SETTINGS.sortDirection;
  }

  merged.userName = ensureString(merged.userName, DEFAULT_SETTINGS.userName);
  merged.userSlogan = ensureString(merged.userSlogan, DEFAULT_SETTINGS.userSlogan);
  merged.avatar = ensureString(merged.avatar, DEFAULT_SETTINGS.avatar);
  merged.quickMemoHeading = ensureString(merged.quickMemoHeading, DEFAULT_SETTINGS.quickMemoHeading).trim() || DEFAULT_SETTINGS.quickMemoHeading;
  merged.fallbackDailyNotesFolder = ensureString(merged.fallbackDailyNotesFolder, DEFAULT_SETTINGS.fallbackDailyNotesFolder).trim();
  merged.fallbackDateFormat = ensureString(merged.fallbackDateFormat, DEFAULT_SETTINGS.fallbackDateFormat).trim() || DEFAULT_SETTINGS.fallbackDateFormat;
  merged.enableBlockIds = typeof merged.enableBlockIds === 'boolean' ? merged.enableBlockIds : DEFAULT_SETTINGS.enableBlockIds;

  return merged;
}

function ensureString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
