import type { DateRangePreset, QuickMemoRecord, QuickMemoType, SortDirection } from '../types';

export type TypeFilter = 'all' | QuickMemoType;
export type TodoStatusFilter = 'all' | 'completed' | 'open';

export interface ViewFilters {
  selectedDate?: string;
  type?: TypeFilter;
  tag?: string;
  text?: string;
  todoStatus?: TodoStatusFilter;
  /** An explicit date pin added on top of a cross-date query (set when the user
   *  clicks a heatmap day while a filter is active). Narrows the vault-wide
   *  results to that one day. Distinct from `selectedDate`, the always-present
   *  navigation/composer date — `dateScope` is removable, `selectedDate` is not. */
  dateScope?: string;
}

/** A single removable active-filter capsule shown above the results. `clear` is
 *  the partial patch that removes just this condition when applied via
 *  onFilterChange. */
export interface ActiveFilterChip {
  key: 'date' | 'type' | 'tag' | 'text';
  /** Shown in the chip (may be CSS-truncated). */
  label: string;
  /** Untruncated text, for title / aria-label. */
  fullLabel: string;
  /** The patch that removes just this condition. */
  clear: Partial<ViewFilters>;
}

/** Is any vault-wide (cross-date) filter active? Tag, keyword, or type. When
 *  true the timeline ignores `selectedDate` and groups matches across all days,
 *  unless `dateScope` further narrows it. Shared by the filter, the renderer's
 *  mode switch, and the view's date-click handler. */
export function crossDateFiltersActive(filters: ViewFilters): boolean {
  const text = filters.text?.trim();
  const hasType = filters.type !== undefined && filters.type !== 'all';
  return Boolean(filters.tag) || Boolean(text) || hasType;
}

/** Describe the active cross-date filters as removable chips, in the order
 *  date → type → tag → keyword. `selectedDate` is excluded — it is the
 *  always-present base date, not a removable query condition. `dateScope` (an
 *  explicit drilled-in day) IS a removable chip. */
export function activeFilterChips(filters: ViewFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.dateScope) {
    const label = `日期：${filters.dateScope}`;
    chips.push({ key: 'date', label, fullLabel: label, clear: { dateScope: undefined } });
  }
  const typeLabel = typeChipLabel(filters);
  if (typeLabel) {
    chips.push({
      key: 'type',
      label: typeLabel,
      fullLabel: typeLabel,
      clear: { type: undefined, todoStatus: undefined },
    });
  }
  if (filters.tag) {
    chips.push({ key: 'tag', label: filters.tag, fullLabel: filters.tag, clear: { tag: undefined } });
  }
  const text = filters.text?.trim();
  if (text) {
    const label = `关键词：${text}`;
    chips.push({ key: 'text', label, fullLabel: label, clear: { text: undefined } });
  }
  return chips;
}

/** Drop soft-deleted tags (settings.deletedTags) from the index's `[tag, count]`
 *  pairs so they don't appear in the sidebar tag list. The `#tag` text remains in
 *  the records — this is display-only. Pass-through (same array) when nothing is
 *  hidden, so the common case allocates nothing. */
export function filterVisibleTags(tags: Array<[string, number]>, deletedTags: readonly string[]): Array<[string, number]> {
  if (deletedTags.length === 0) return tags;
  const hidden = new Set(deletedTags);
  return tags.filter(([tag]) => !hidden.has(tag));
}

/** Label for the active type filter, mirroring the composite select options.
 *  Returns undefined when no type chip should appear (none / `all`). */
function typeChipLabel(filters: ViewFilters): string | undefined {
  if (filters.type === undefined || filters.type === 'all') return undefined;
  if (filters.type === 'record') return '记录';
  if (filters.type === 'flash') return '闪念';
  if (filters.type === 'todo') {
    if (filters.todoStatus === 'completed') return '已完成待办';
    if (filters.todoStatus === 'open') return '未完成待办';
    return '待办';
  }
  return undefined;
}

/** Should an onFilterChange patch be ignored? Only a no-op text commit is — the
 *  search box's Enter/blur handler re-fires with the same value while the DOM
 *  is being torn down and rebuilt, which would re-trigger a search. Every other
 *  patch (a real text change, a chip removal, clear-all) is applied, so clearing
 *  non-text filters never gets short-circuited. */
export function isSkippableFilterPatch(patch: Partial<ViewFilters>, current: ViewFilters): boolean {
  const keys = Object.keys(patch);
  if (!(keys.length === 1 && keys[0] === 'text')) return false;
  return (patch.text ?? '') === (current.text ?? '');
}

export function filterRecordsForView(records: QuickMemoRecord[], filters: ViewFilters): QuickMemoRecord[] {
  const text = filters.text?.trim().toLowerCase();
  // Tag, keyword, and type filters are vault-wide: they ignore the selected
  // date so the user sees every matching record across all days, grouped later.
  const crossDate = crossDateFiltersActive(filters);
  return records.filter((record) => {
    // An explicit dateScope (drilled in via the heatmap while a filter was
    // active) narrows the cross-date results to one day and takes precedence
    // over selectedDate. Without a filter, selectedDate scopes the single-day view.
    if (filters.dateScope && record.date !== filters.dateScope) return false;
    if (!crossDate && filters.selectedDate && record.date !== filters.selectedDate) return false;
    if (filters.type && filters.type !== 'all' && record.type !== filters.type) return false;
    if (filters.tag && !record.tags.includes(filters.tag)) return false;
    if (filters.todoStatus === 'completed' && record.completed !== true) return false;
    if (filters.todoStatus === 'open' && record.completed !== false) return false;
    if (text) {
      const haystack = `${record.content}\n${record.body ?? ''}\n${record.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

/** Strip a stale `dateScope` when there is no longer a cross-date filter to pin
 *  it against. In single-day mode the filter bar (and its date chip) never
 *  renders, so a lingering pin would be invisible yet silently re-scope results
 *  the next time a filter is added. Call after merging an onFilterChange patch. */
export function normalizeFilters(filters: ViewFilters): ViewFilters {
  if (filters.dateScope && !crossDateFiltersActive(filters)) {
    const { dateScope, ...rest } = filters;
    return rest;
  }
  return filters;
}

/**
 * Sort a copy of the records for display. Records that share a selectedDate are
 * ordered by time. `desc` (the spec default) puts the newest record first.
 */
export function sortRecordsForDisplay(records: QuickMemoRecord[], direction: SortDirection): QuickMemoRecord[] {
  return [...records].sort((a, b) => {
    const cmp = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function dateRangeForPreset(preset: DateRangePreset, today: string): { startDate: string; endDate: string } | undefined {
  if (preset === 'custom') return undefined;
  const days = preset === 'today' ? 1 : preset === '7d' ? 7 : 30;
  return { startDate: addDays(today, -(days - 1)), endDate: today };
}

function addDays(date: string, delta: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + delta);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Decide whether the selected date should follow the clock across midnight.
 *
 * - `previousToday` is the local date the view last considered "today".
 * - `now` is the current local date.
 *
 * Returns the new selectedDate when the day rolled over AND the user was viewing
 * "today"; returns `undefined` otherwise (no rollover, or the user is browsing a
 * historical date and should not be pulled back to today).
 */
export function rollSelectedDate(selectedDate: string, previousToday: string, now: string): string | undefined {
  if (now === previousToday) return undefined;
  return selectedDate === previousToday ? now : undefined;
}
