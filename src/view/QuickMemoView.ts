import { App, Component, ItemView, MarkdownRenderer, Menu, Modal, Notice, Setting, WorkspaceLeaf } from 'obsidian';
import { QUICK_MEMO_ICON, VIEW_TYPE_QUICK_MEMO } from '../constants';
import type { QuickMemoRecord, QuickMemoSettings, QuickMemoType } from '../types';
import type { IndexService } from '../index/IndexService';
import type { MarkdownRecordRepository } from '../markdown/MarkdownRecordRepository';
import { randomIdSuffix } from '../markdown/id';
import { crossDateFiltersActive, filterRecordsForView, isSkippableFilterPatch, normalizeFilters, rollSelectedDate, sortRecordsForDisplay, type ViewFilters } from './viewState';
import { renderOverview, recordKey } from './render';

export class QuickMemoView extends ItemView {
  private selectedDate = today();
  private currentDay = today();
  private filters: ViewFilters = {};
  private editingRecordId: string | undefined;
  private openMenuRecordId: string | undefined;
  private dayWatcher: number | undefined;
  /** Child components created by MarkdownRenderer during a render; unloaded on
   *  the next full re-render so the live markdown rendering doesn't leak. */
  private renderChildren: Component[] = [];

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settings: QuickMemoSettings,
    private readonly repository: MarkdownRecordRepository,
    private readonly index: IndexService,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_QUICK_MEMO;
  }

  getDisplayText(): string {
    return 'Quick Memo';
  }

  /** Match the ribbon icon so the side-panel tab header and the left-ribbon
   *  button show the same glyph. */
  getIcon(): string {
    return QUICK_MEMO_ICON;
  }

  async onOpen(): Promise<void> {
    this.currentDay = today();
    this.render();
    void this.rebuildIndexInBackground();
    // Check once a minute for a local-day rollover while the view stays open.
    this.dayWatcher = window.setInterval(() => this.checkDayRollover(), 60_000);
    // Close an open record menu on the next tap/click anywhere outside it.
    activeDocument.addEventListener('pointerdown', this.handleOutsideInteraction, true);
  }

  async onClose(): Promise<void> {
    if (this.dayWatcher !== undefined) {
      window.clearInterval(this.dayWatcher);
      this.dayWatcher = undefined;
    }
    activeDocument.removeEventListener('pointerdown', this.handleOutsideInteraction, true);
  }

  /**
   * Capture-phase pointerdown fires before a card's own click handlers, which is
   * essential here: those handlers re-render the DOM and detach the original event
   * target, so a later-phase listener couldn't recognise it. If a menu is open and
   * the press is outside the menu or its trigger, close the menu.
   */
  private handleOutsideInteraction = (event: PointerEvent): void => {
    if (this.openMenuRecordId === undefined) return;
    const target = event.target;
    if (target instanceof Element && (target.closest('.oqm-record-menu') || target.closest('.oqm-record-menu-trigger'))) {
      return;
    }
    this.openMenuRecordId = undefined;
    this.render();
  };

  async refresh(): Promise<void> {
    try {
      await this.index.refreshChangedFiles();
      this.notifyWarnings();
      this.render();
    } catch (error) {
      this.showFatalError(error);
    }
  }

  private async rebuildIndexInBackground(): Promise<void> {
    try {
      await this.index.rebuild();
      this.notifyWarnings();
      this.render();
    } catch (error) {
      this.showFatalError(error);
    }
  }

  private checkDayRollover(): void {
    const now = today();
    const next = rollSelectedDate(this.selectedDate, this.currentDay, now);
    this.currentDay = now;
    if (next !== undefined) {
      this.selectedDate = next;
      this.render();
    }
  }

  private notifyWarnings(): void {
    const n = this.index.warnings().length;
    if (n > 0) {
      new Notice(`Quick Memo 解析到 ${n} 条格式冲突，请检查对应 Daily Note。`);
    }
  }

  private showFatalError(error: unknown): void {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    this.contentEl.empty();
    this.contentEl.addClass('oqm-root');
    const box = this.contentEl.createDiv({ cls: 'oqm-fatal-error' });
    box.createEl('h3', { text: 'Quick Memo 打开失败' });
    box.createEl('p', { text: message });
    new Notice(`Quick Memo 打开失败：${message}`);
  }

  private render(): void {
    // Tear down the previous render's markdown child components before rebuilding.
    for (const child of this.renderChildren) {
      try {
        child.unload();
      } catch {
        /* already disposed */
      }
    }
    this.renderChildren = [];

    // Snapshot the focused text field so the full re-render can restore its focus
    // and caret — otherwise rebuilding the DOM on each search keystroke drops it.
    const restoreFocus = captureFocusRestore(this.contentEl);

    const allRecords = this.index.query({});
    const filtered = filterRecordsForView(allRecords, { ...this.filters, selectedDate: this.selectedDate });
    const records = sortRecordsForDisplay(filtered, this.settings.sortDirection);
    renderOverview(this.contentEl, {
      settings: this.settings,
      records,
      tags: this.index.tags(),
      heatmap: this.index.heatmap(),
      selectedDate: this.selectedDate,
      todayDate: today(),
      editingRecordId: this.editingRecordId,
      openMenuRecordId: this.openMenuRecordId,
      filters: this.filters,
      stats: computeStats(allRecords),
      markdown: {
        render: (source, el) => {
          const component = new Component();
          component.load();
          void MarkdownRenderer.render(this.app, source, el, '', component);
          this.renderChildren.push(component);
        },
      },
    }, {
      onSave: (draft) => this.saveDraft(draft),
      onSelectDate: (date) => {
        this.selectedDate = date;
        // Clicking a day while a cross-date filter is active drills into that
        // day (date + condition), surfaced as a removable date chip. With no
        // filter active it is ordinary single-day navigation and dateScope stays
        // unset, so the heatmap just moves the single-day view.
        if (crossDateFiltersActive(this.filters)) {
          this.filters = { ...this.filters, dateScope: date };
        }
        this.render();
      },
      onToggleTodo: (record) => {
        this.openMenuRecordId = undefined;
        void this.toggleTodo(record);
      },
      onEdit: (record) => {
        this.openMenuRecordId = undefined;
        this.editingRecordId = recordKey(record);
        this.render();
      },
      onSaveEdit: (record, changes) => void this.saveEdit(record, changes),
      onCancelEdit: () => {
        this.editingRecordId = undefined;
        this.render();
      },
      onDelete: (record) => {
        this.openMenuRecordId = undefined;
        void this.deleteRecord(record);
      },
      onCopyBlock: (record) => {
        this.openMenuRecordId = undefined;
        this.copyBlock(record);
        this.render();
      },
      onOpenSource: (record) => {
        this.openMenuRecordId = undefined;
        void this.openSource(record);
      },
      onFilterChange: (filters) => {
        // Skip only a no-op text re-commit (the search box's Enter/blur firing
        // the same value during DOM teardown). Chip removals and clear-all must
        // always apply — see isSkippableFilterPatch.
        if (isSkippableFilterPatch(filters, this.filters)) return;
        // normalizeFilters drops a stale dateScope once the last cross-date
        // filter is removed (the pin is meaningless in single-day mode).
        this.filters = normalizeFilters({ ...this.filters, ...filters });
        this.render();
      },
      onToggleMenu: (recordId) => {
        this.openMenuRecordId = this.openMenuRecordId === recordId ? undefined : recordId;
        this.render();
      },
      onTagContext: (tag, event) => {
        const menu = new Menu();
        menu.addItem((item) => item.setTitle('删除标签').setIcon('trash').onClick(() => void this.deleteTag(tag)));
        menu.showAtMouseEvent(event);
      },
    });

    restoreFocus?.();

    // If a record's action menu is open, make sure it isn't clipped by the bottom
    // of the viewport — scroll it into view on the next frame (after the DOM is
    // laid out). `block: 'nearest'` only scrolls when the menu is off-screen, so
    // middle-of-list cards don't jump.
    if (this.openMenuRecordId !== undefined) {
      window.requestAnimationFrame(() => {
        const menu = this.contentEl.querySelector<HTMLElement>('.oqm-record-menu');
        menu?.scrollIntoView({ block: 'nearest' });
      });
    }
  }

  private async deleteTag(tag: string): Promise<void> {
    const confirmed = await confirmDialog(this.app, '删除标签', `从所有 Quick Memo 记录中移除标签 ${tag}？\n此操作会修改包含该标签的 Daily Note 文件。`);
    if (!confirmed) return;
    const count = await this.repository.removeTag(tag);
    await this.index.rebuild();
    this.render();
    new Notice(count > 0 ? `已从 ${count} 条记录中移除 ${tag}` : `没有记录包含标签 ${tag}（已刷新列表）`);
  }

  private async saveDraft(draft: { type: QuickMemoType; content: string }): Promise<boolean> {
    // Resolve the target date. Capturing while browsing a non-today day prompts
    // the user to confirm where the record goes; cancel aborts without saving
    // (and the composer keeps its text). Returns false on cancel so the renderer
    // knows to preserve the input.
    const todayDate = today();
    let date = this.selectedDate;
    if (this.selectedDate !== todayDate) {
      const choice = await chooseSaveDateDialog(this.app, this.selectedDate, todayDate);
      if (choice === undefined) return false;
      if (choice === 'today') {
        date = todayDate;
        // Jump the view to today so the just-saved record is immediately visible.
        this.selectedDate = todayDate;
      }
    }
    const [content, ...bodyLines] = draft.content.replace(/\r\n/gu, '\n').split('\n');
    await this.repository.appendRecord({
      date,
      time: currentTime(),
      type: draft.type,
      content,
      body: bodyLines.join('\n') || undefined,
      completed: draft.type === 'todo' ? false : undefined,
    }, randomIdSuffix());
    await this.index.rebuild();
    this.render();
    return true;
  }

  private async toggleTodo(record: QuickMemoRecord): Promise<void> {
    if (!record.id) {
      new Notice('该记录缺少块 ID，请先补全 ID 后再勾选。');
      this.render();
      return;
    }
    await this.repository.toggleTodo(record.id);
    await this.index.rebuild();
    this.render();
  }

  private async saveEdit(record: QuickMemoRecord, changes: { type: QuickMemoType; content: string; body?: string }): Promise<void> {
    if (!record.id) {
      new Notice('该记录缺少块 ID，请先补全 ID 后再编辑。');
      return;
    }
    await this.repository.updateRecord(record.id, changes);
    this.editingRecordId = undefined;
    await this.index.rebuild();
    this.render();
  }

  private async deleteRecord(record: QuickMemoRecord): Promise<void> {
    if (!record.id) {
      new Notice('该记录缺少块 ID，请先补全 ID 后再删除。');
      return;
    }
    const confirmed = await confirmDialog(this.app, '删除记录', '删除这条 Quick Memo？此操作会修改 Daily Note 文件。');
    if (!confirmed) return;
    await this.repository.deleteRecord(record.id);
    await this.index.rebuild();
    this.render();
  }

  private copyBlock(record: QuickMemoRecord): void {
    if (!record.id) {
      new Notice('该记录缺少块 ID，无法复制块链接。');
      return;
    }
    const link = `[[${record.filePath.replace(/\.md$/u, '')}#^${record.id}]]`;
    void navigator.clipboard.writeText(link);
    new Notice('已复制块链接');
  }

  private async openSource(record: QuickMemoRecord): Promise<void> {
    await this.app.workspace.openLinkText(record.filePath, '', false);
  }
}

function today(): string {
  return localDateString(new Date());
}

function currentTime(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function localDateString(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Reduce the full record set into the global stats shown under the heatmap. */
function computeStats(records: QuickMemoRecord[]): { days: number; total: number; flash: number; record: number; todo: number; todoDone: number } {
  const days = new Set<string>();
  let flash = 0;
  let record = 0;
  let todo = 0;
  let todoDone = 0;
  for (const r of records) {
    days.add(r.date);
    if (r.type === 'flash') flash += 1;
    else if (r.type === 'record') record += 1;
    else if (r.type === 'todo') {
      todo += 1;
      if (r.completed) todoDone += 1;
    }
  }
  return { days: days.size, total: records.length, flash, record, todo, todoDone };
}

/**
 * Snapshot the focused text field inside `scope` (one of our live inputs) so a
 * full re-render can restore its focus and caret afterwards. Without this,
 * rebuilding the DOM on every search keystroke discards the field mid-type.
 */
function captureFocusRestore(scope: HTMLElement): (() => void) | undefined {
  const el = activeDocument.activeElement;
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return undefined;
  if (!scope.contains(el)) return undefined;
  const selector = el.classList.contains('oqm-search') ? '.oqm-search'
    : el.classList.contains('oqm-edit-input') ? '.oqm-edit-input'
    : el.classList.contains('oqm-input') ? '.oqm-input'
    : '';
  if (!selector) return undefined;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  return () => {
    const next = scope.querySelector(selector);
    if (!(next instanceof HTMLInputElement) && !(next instanceof HTMLTextAreaElement)) return;
    next.focus();
    try {
      next.setSelectionRange(start, end);
    } catch {
      /* some input types don't support setSelectionRange */
    }
  };
}

/** A Modal-based confirmation dialog — replaces window.confirm, which Obsidian
 *  discourages. Resolves true on confirm, false on cancel. */
function confirmDialog(app: App, title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new Modal(app);
    modal.setTitle(title);
    modal.setContent(message);
    let result = false;
    new Setting(modal.contentEl)
      .addButton((button) => button
        .setButtonText('确认')
        .setCta()
        .onClick(() => {
          result = true;
          modal.close();
        }))
      .addButton((button) => button
        .setButtonText('取消')
        .onClick(() => modal.close()));
    modal.onClose = () => resolve(result);
    modal.open();
  });
}

/** Modal that asks where to save a record when the user captures on a non-today
 *  date. Three buttons in one row: save to the selected date (primary CTA, since
 *  the user is already composing there), save to today, or cancel. Resolves
 *  'selected' | 'today' | undefined (undefined = cancelled / closed). */
function chooseSaveDateDialog(app: App, selectedDate: string, todayDate: string): Promise<'today' | 'selected' | undefined> {
  return new Promise((resolve) => {
    const modal = new Modal(app);
    modal.setTitle('提醒');
    modal.setContent(`当前选择的是 ${selectedDate}，不是今天（${todayDate}）。这条记录要保存到哪一天？`);
    let result: 'today' | 'selected' | undefined = undefined;
    new Setting(modal.contentEl)
      .addButton((button) => button
        .setButtonText(`保存到 ${selectedDate}`)
        .setCta()
        .onClick(() => {
          result = 'selected';
          modal.close();
        }))
      .addButton((button) => button
        .setButtonText('保存到今天')
        .onClick(() => {
          result = 'today';
          modal.close();
        }))
      .addButton((button) => button
        .setButtonText('取消')
        .onClick(() => modal.close()));
    modal.onClose = () => resolve(result);
    modal.open();
  });
}
