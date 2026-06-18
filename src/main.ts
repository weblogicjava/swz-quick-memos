import { Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_QUICK_MEMO } from './constants';
import { DailyNoteResolver } from './daily-notes/DailyNoteResolver';
import { getDailyNotesConfig } from './daily-notes/obsidianInternal';
import { IndexService } from './index/IndexService';
import { MarkdownRecordRepository } from './markdown/MarkdownRecordRepository';
import { QuickMemoParser } from './markdown/QuickMemoParser';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings/settings';
import { QuickMemoSettingTab } from './settings/SettingsTab';
import type { QuickMemoSettings } from './types';
import { QuickMemoView } from './view/QuickMemoView';

class ObsidianVaultAdapter {
  constructor(private readonly plugin: Plugin) {}

  async read(path: string): Promise<string> {
    const file = this.getFile(path);
    return this.plugin.app.vault.read(file);
  }

  async modify(path: string, content: string): Promise<void> {
    const file = this.getFile(path);
    await this.plugin.app.vault.modify(file, content);
  }

  async create(path: string, content: string): Promise<void> {
    await this.plugin.app.vault.create(path, content);
  }

  exists(path: string): boolean {
    return this.plugin.app.vault.getAbstractFileByPath(path) instanceof TFile;
  }

  listMarkdownFiles(): string[] {
    return this.plugin.app.vault.getMarkdownFiles().map((file) => file.path);
  }

  stat(path: string): { mtime: number } | undefined {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? { mtime: file.stat.mtime } : undefined;
  }

  private getFile(path: string): TFile {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error(`File not found: ${path}`);
    return file;
  }
}

export default class QuickMemoPlugin extends Plugin {
  settings: QuickMemoSettings = DEFAULT_SETTINGS;
  private index!: IndexService;

  async onload(): Promise<void> {
    await this.loadSettings();

    const vault = new ObsidianVaultAdapter(this);
    const parser = new QuickMemoParser(this.settings.quickMemoHeading);
    const resolver = new DailyNoteResolver(vault, getDailyNotesConfig(this.app), this.settings);
    const repository = new MarkdownRecordRepository(vault, resolver, parser, this.settings);
    this.index = new IndexService(vault, parser);

    this.registerView(VIEW_TYPE_QUICK_MEMO, (leaf) => new QuickMemoView(leaf, this.settings, repository, this.index));

    this.addRibbonIcon('notebook-pen', 'Open Quick Memo', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-quick-memo-overview',
      name: 'Open Quick Memo overview',
      callback: () => void this.activateView(),
    });

    this.addCommand({
      id: 'rebuild-quick-memo-index',
      name: 'Rebuild Quick Memo index',
      callback: async () => {
        await this.index.rebuild();
        new Notice('Quick Memo 索引已重建');
      },
    });

    this.addCommand({
      id: 'backfill-current-day-quick-memo-ids',
      name: 'Backfill missing Quick Memo block IDs for today',
      callback: async () => {
        const count = await repository.backfillMissingIds(new Date().toISOString().slice(0, 10));
        await this.index.rebuild();
        new Notice(`已补全 ${count} 条 Quick Memo ID`);
      },
    });

    this.registerEvent(this.app.vault.on('modify', () => {
      void this.index.refreshChangedFiles();
    }));

    this.addSettingTab(new QuickMemoSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_QUICK_MEMO);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_QUICK_MEMO)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) throw new Error('Unable to create Quick Memo view leaf.');
      await leaf.setViewState({ type: VIEW_TYPE_QUICK_MEMO, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
