import { describe, expect, it, vi } from 'vitest';
import type { QuickMemoRecord } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import { renderOverview } from '../src/view/render';
import type { OverviewStats } from '../src/view/render';

type Stats = OverviewStats;

describe('renderOverview', () => {
  it('renders profile, input, records, filters, and heatmap', () => {
    const root = document.createElement('div');
    const callbacks = {
      onSave: vi.fn(),
      onSelectDate: vi.fn(),
      onToggleTodo: vi.fn(),
      onEdit: vi.fn(),
      onSaveEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onDelete: vi.fn(),
      onCopyBlock: vi.fn(),
      onOpenSource: vi.fn(),
      onFilterChange: vi.fn(),
      onToggleMenu: vi.fn(),
      onTagContext: vi.fn(),
    };

    renderOverview(root, {
      settings: { ...DEFAULT_SETTINGS, userName: 'Ada', userSlogan: 'Think clearly' },
      records: [makeRecord('oqm-1', '2026-06-18', '09:00', 'flash', 'idea #a')],
      tags: [['#a', 1]],
      heatmap: [{ date: '2026-06-18', count: 1 }],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, callbacks);

    expect(root.querySelector('.oqm-layout')).toBeTruthy();
    expect(root.textContent).toContain('Ada');
    expect(root.textContent).toContain('Think clearly');
    expect(root.textContent).toContain('idea #a');
    expect(root.textContent).toContain('#a');
    expect(root.querySelector<HTMLTextAreaElement>('.oqm-input')?.placeholder).toContain('Markdown');
    // Heatmap is a single flat stream of the last ~3 months (90 days ending today),
    // placed between the slogan and the filter area. No month grouping or date text.
    expect(root.querySelectorAll('.oqm-heatmap-month-label')).toHaveLength(0);
    const dayCells = root.querySelectorAll('.oqm-heatmap-day');
    expect(dayCells).toHaveLength(90); // 90-day window ending 2026-06-18
    const recordDay = Array.from(dayCells).find((cell) => cell.getAttribute('title') === '2026-06-18：1 条');
    expect(recordDay?.classList.contains('oqm-heatmap-level-4')).toBe(true);
    expect(recordDay?.classList.contains('oqm-heatmap-selected')).toBe(true);
  });

  it('calls onSelectDate when a heatmap day is clicked', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [{ date: '2026-06-15', count: 2 }],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, callbacks);

    const day15 = Array.from(root.querySelectorAll('.oqm-heatmap-day')).find((cell) => cell.getAttribute('title')?.startsWith('2026-06-15')) as HTMLButtonElement;
    day15.click();
    expect(callbacks.onSelectDate).toHaveBeenCalledWith('2026-06-15');
  });

  it('renders record actions behind a top-right menu, not a bottom action row', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [makeRecord('oqm-9', '2026-06-18', '09:00', 'flash', 'idea #a')],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, callbacks);

    // No bottom action row and no open menu by default; trigger is present.
    expect(root.querySelector('.oqm-record-actions')).toBeNull();
    expect(root.querySelector('.oqm-record-menu')).toBeNull();
    const trigger = root.querySelector('.oqm-record-menu-trigger') as HTMLButtonElement;
    expect(trigger).toBeTruthy();

    trigger.click();
    expect(callbacks.onToggleMenu).toHaveBeenCalledWith('oqm-9');
  });

  it('shows the action menu only for the open record', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [makeRecord('oqm-9', '2026-06-18', '09:00', 'todo', 'task #t', false)],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: 'oqm-9',
      filters: {},
      stats: makeStats(),
    }, callbacks);

    const items = Array.from(root.querySelectorAll('.oqm-record-menu-item')) as HTMLButtonElement[];
    expect(items.map((item) => item.textContent)).toEqual(['标记完成', '编辑', '复制块链接', '打开源文件', '删除']);
    items[0].click(); // 标记完成
    expect(callbacks.onToggleTodo).toHaveBeenCalled();
    items[4].click(); // 删除
    expect(callbacks.onDelete).toHaveBeenCalled();
  });

  it('toggles an already-selected tag off when clicked again', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [['#a', 2]],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: { tag: '#a' },
      stats: makeStats(),
    }, callbacks);

    const tagButton = root.querySelector<HTMLButtonElement>('.oqm-tags button')!;
    expect(tagButton.classList.contains('oqm-tag-selected')).toBe(true);
    expect(tagButton.getAttribute('aria-pressed')).toBe('true');
    tagButton.click();
    expect(callbacks.onFilterChange).toHaveBeenCalledWith({ tag: undefined });
  });

  it('offers all six type filter options including todo status composites', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, makeCallbacks());

    const select = root.querySelector<HTMLSelectElement>('.oqm-type-filter');
    expect(select).toBeTruthy();
    const options = Array.from(select!.querySelectorAll('option'));
    expect(options).toHaveLength(6);
    const values = options.map((option) => option.value);
    expect(values).toEqual(['all', 'record', 'flash', 'todo', 'todo-done', 'todo-open']);
    const labels = options.map((option) => option.textContent);
    expect(labels).toEqual(['全部', '记录', '闪念', '待办', '已完成待办', '未完成待办']);
  });

  it('reflects todo-done and todo-open composite filters in the select value', () => {
    const doneRoot = document.createElement('div');
    renderOverview(doneRoot, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      filters: { type: 'todo', todoStatus: 'completed' },
      stats: makeStats(),
    }, makeCallbacks());
    expect(doneRoot.querySelector<HTMLSelectElement>('.oqm-type-filter')?.value).toBe('todo-done');

    const openRoot = document.createElement('div');
    renderOverview(openRoot, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      filters: { type: 'todo', todoStatus: 'open' },
      stats: makeStats(),
    }, makeCallbacks());
    expect(openRoot.querySelector<HTMLSelectElement>('.oqm-type-filter')?.value).toBe('todo-open');
  });

  it('dispatches composite filters with todoStatus and clears it for plain types', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, callbacks);

    const select = root.querySelector<HTMLSelectElement>('.oqm-type-filter')!;

    select.value = 'todo-done';
    select.dispatchEvent(new Event('change'));
    expect(callbacks.onFilterChange).toHaveBeenLastCalledWith({ type: 'todo', todoStatus: 'completed' });

    select.value = 'todo-open';
    select.dispatchEvent(new Event('change'));
    expect(callbacks.onFilterChange).toHaveBeenLastCalledWith({ type: 'todo', todoStatus: 'open' });

    select.value = 'flash';
    select.dispatchEvent(new Event('change'));
    expect(callbacks.onFilterChange).toHaveBeenLastCalledWith({ type: 'flash', todoStatus: undefined });
  });

  it('renders global stats below the heatmap', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats({ days: 3, total: 10, flash: 4, record: 3, todo: 3, todoDone: 2 }),
    }, makeCallbacks());

    const stats = root.querySelector('.oqm-stats');
    expect(stats).toBeTruthy();
    expect(stats!.textContent).toContain('3');
    expect(stats!.textContent).toContain('10');
    expect(stats!.textContent).toContain('闪念');
    expect(stats!.textContent).toContain('记录');
    expect(stats!.textContent).toContain('待办');
    // completion ratio 2/3
    expect(stats!.textContent).toContain('2/3');
    const bar = stats!.querySelector<HTMLDivElement>('.oqm-stats-ratio-bar > div');
    expect(bar).toBeTruthy();
    expect(bar!.style.width).toBe('66.7%');
  });

  it('shows a 今天 link when a non-today date is selected and jumps back to today on click', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-10',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, callbacks);

    const todayLink = root.querySelector<HTMLButtonElement>('.oqm-heatmap-today');
    expect(todayLink).toBeTruthy();
    todayLink!.click();
    expect(callbacks.onSelectDate).toHaveBeenCalledWith('2026-06-18');
  });

  it('hides the 今天 link when today is already selected', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, makeCallbacks());

    expect(root.querySelector('.oqm-heatmap-today')).toBeNull();
  });

  it('shows the selected date next to the composer type selector', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-21',
      todayDate: '2026-06-21',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, makeCallbacks());

    expect(root.querySelector('.oqm-composer-date')?.textContent).toBe('2026-06-21');
  });

  it('groups records by date when a tag or text filter spans multiple dates', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [
        makeRecord('1', '2026-06-18', '09:00', 'flash', 'idea #a'),
        makeRecord('2', '2026-06-17', '08:00', 'record', 'note #a'),
      ],
      tags: [['#a', 2]],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: { tag: '#a' },
      stats: makeStats(),
    }, makeCallbacks());

    // Cross-date mode: a "筛选结果" heading, not a single-date timeline heading.
    expect(root.querySelector('.oqm-main h3')?.textContent).toBe('筛选结果');
    // Date group headings appear, newest date first.
    const groupHeadings = Array.from(root.querySelectorAll('.oqm-date-group-heading')).map((el) => el.textContent);
    expect(groupHeadings).toEqual(['2026-06-18', '2026-06-17']);
  });

  it('makes the flash/record/todo stat cards clickable to filter by type', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats({ flash: 4, record: 3, todo: 2 }),
    }, callbacks);

    const cards = Array.from(root.querySelectorAll('.oqm-stat-card-clickable')) as HTMLButtonElement[];
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.textContent)).toEqual(['4闪念', '3记录', '2待办']);
    // Clicking the flash card applies the type filter.
    cards[0].click();
    expect(callbacks.onFilterChange).toHaveBeenCalledWith({ type: 'flash', todoStatus: undefined });
  });

  it('marks the stat card active when its type is the current filter and toggles it off', () => {
    const root = document.createElement('div');
    const callbacks = makeCallbacks();
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: { type: 'flash' },
      stats: makeStats(),
    }, callbacks);

    const cards = Array.from(root.querySelectorAll('.oqm-stat-card-clickable')) as HTMLButtonElement[];
    expect(cards[0].classList.contains('oqm-stat-card-active')).toBe(true);
    // Clicking the active card clears the filter.
    cards[0].click();
    expect(callbacks.onFilterChange).toHaveBeenCalledWith({ type: undefined, todoStatus: undefined });
  });

  it('color-codes todo badges by completion state', () => {
    const root = document.createElement('div');
    renderOverview(root, {
      settings: DEFAULT_SETTINGS,
      records: [
        makeRecord('done', '2026-06-18', '09:00', 'todo', 'done task', true),
        makeRecord('open', '2026-06-18', '10:00', 'todo', 'open task', false),
      ],
      tags: [],
      heatmap: [],
      selectedDate: '2026-06-18',
      todayDate: '2026-06-18',
      editingRecordId: undefined,
      openMenuRecordId: undefined,
      filters: {},
      stats: makeStats(),
    }, makeCallbacks());

    const badges = Array.from(root.querySelectorAll('.oqm-record-badge'));
    expect(badges[0].classList.contains('oqm-badge-done')).toBe(true);
    expect(badges[1].classList.contains('oqm-badge-open')).toBe(true);
  });
});

function makeCallbacks() {
  return {
    onSave: vi.fn(),
    onSelectDate: vi.fn(),
    onToggleTodo: vi.fn(),
    onEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDelete: vi.fn(),
    onCopyBlock: vi.fn(),
    onOpenSource: vi.fn(),
    onFilterChange: vi.fn(),
    onToggleMenu: vi.fn(),
    onTagContext: vi.fn(),
  };
}

function makeStats(overrides: Partial<Stats> = {}): Stats {
  return { days: 2, total: 4, flash: 1, record: 1, todo: 2, todoDone: 1, ...overrides };
}

function makeRecord(id: string, date: string, time: string, type: QuickMemoRecord['type'], content: string, completed?: boolean): QuickMemoRecord {
  return { id, date, time, type, content, tags: content.match(/#[a-z]/g) ?? [], completed, filePath: `${date}.md`, lineStart: 1, lineEnd: 1, hasStableId: true, raw: content, contentHash: id };
}
