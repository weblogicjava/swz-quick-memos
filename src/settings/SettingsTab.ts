import { App, Modal, Plugin, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type { QuickMemoSettings, QuickMemoType, SortDirection } from '../types';
import { normalizeSettings } from './settings';
import { quickMemoSettingDefinitions } from './settingDefinitions';

interface QuickMemoSettingsHost extends Plugin {
  settings: QuickMemoSettings;
  saveSettings(): Promise<void>;
}

export class QuickMemoSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: QuickMemoSettingsHost) {
    super(app, plugin);
  }

  /**
   * Declarative settings (Obsidian 1.13.0+): the framework renders these and
   * indexes them for the unified settings search, so the tab's settings are
   * searchable. On 1.13.0+ display() is not called; display() below remains as
   * the fallback for Obsidian < 1.13.0 (minAppVersion is 1.7.2). Keys/names/descs
   * mirror display() so both paths render identically.
   */
  override getSettingDefinitions(): SettingDefinitionItem[] {
    // The scalar controls live in pure, unit-tested quickMemoSettingDefinitions();
    // append the plugin-backed "manage deleted tags" action here (it needs the
    // plugin ref, which the pure data module can't import).
    return [
      ...quickMemoSettingDefinitions(),
      {
        name: '管理已删除标签',
        desc: '恢复被隐藏（右键删除）的标签。',
        action: () => {
          manageDeletedTagsDialog(this.app, this.plugin);
        },
      },
    ];
  }

  /**
   * Persist a declarative control change. The base mutates `plugin.settings` and
   * persists, but does not rebuild the index / refresh the open view — so route
   * through `normalizeSettings` (same trim/defaults/validation as display()) and
   * `saveSettings()` to keep heading/folder/format changes live.
   */
  override async setControlValue(key: string, value: unknown): Promise<void> {
    // Mutate `plugin.settings` in place rather than reassigning. The long-lived
    // QuickMemoView captured the same object reference at construction; reassigning
    // here would leave the view reading a stale object (and break tag hide/restore,
    // which the view mutates on that shared reference). display() already mutates
    // in place, so this aligns the two render paths.
    Object.assign(this.plugin.settings, normalizeSettings({ ...this.plugin.settings, [key]: value }));
    await this.plugin.saveSettings();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('用户名称')
      .setDesc('显示在总览页左侧。')
      .addText((text) => text
        .setValue(this.plugin.settings.userName)
        .onChange(async (value) => {
          this.plugin.settings.userName = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Slogan')
      .setDesc('显示在用户名称下方。')
      .addText((text) => text
        .setValue(this.plugin.settings.userSlogan)
        .onChange(async (value) => {
          this.plugin.settings.userSlogan = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('头像路径或 URL')
      .setDesc('可以填写 vault 内图片路径或外部 URL。')
      .addText((text) => text
        .setValue(this.plugin.settings.avatar)
        .onChange(async (value) => {
          this.plugin.settings.avatar = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Quick Memo 标题')
      .setDesc('插件只读写这个二级标题下的记录。')
      .addText((text) => text
        .setValue(this.plugin.settings.quickMemoHeading)
        .onChange(async (value) => {
          this.plugin.settings.quickMemoHeading = value.trim() || 'Quick Memo';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('使用自定义日记路径')
      .setDesc('开启后忽略 Obsidian Daily Notes 配置，按下面的文件夹和日期格式定位文件。推荐开启，定位最稳定。')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.overrideDailyNotesConfig)
        .onChange(async (value) => {
          this.plugin.settings.overrideDailyNotesConfig = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('日记文件夹')
      .setDesc('记录写入的文件夹，例如 每日工作。')
      .addText((text) => text
        .setValue(this.plugin.settings.fallbackDailyNotesFolder)
        .onChange(async (value) => {
          this.plugin.settings.fallbackDailyNotesFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('日期格式')
      .setDesc('支持 YYYY、MM、DD。例如 YYYY/MM/YYYY-MM-DD 会生成 2026/06/2026-06-19-quick-memos.md。')
      .addText((text) => text
        .setValue(this.plugin.settings.fallbackDateFormat)
        .onChange(async (value) => {
          this.plugin.settings.fallbackDateFormat = value.trim() || 'YYYY-MM-DD';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('启用块 ID')
      .setDesc('默认开启以获得稳定编辑、勾选和块链接；关闭后进入纯净 Markdown 模式。')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableBlockIds)
        .onChange(async (value) => {
          this.plugin.settings.enableBlockIds = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('默认记录类型')
      .addDropdown((dropdown) => dropdown
        .addOption('record', '记录')
        .addOption('flash', '闪念')
        .addOption('todo', '待办')
        .setValue(this.plugin.settings.defaultRecordType)
        .onChange(async (value) => {
          this.plugin.settings.defaultRecordType = value as QuickMemoType;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('记录排序')
      .addDropdown((dropdown) => dropdown
        .addOption('desc', '最新在上')
        .addOption('asc', '最早在上')
        .setValue(this.plugin.settings.sortDirection)
        .onChange(async (value) => {
          this.plugin.settings.sortDirection = value as SortDirection;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('管理已删除标签')
      .setDesc('恢复被隐藏（右键删除）的标签。')
      .addButton((button) => button
        .setButtonText('管理')
        .onClick(() => manageDeletedTagsDialog(this.app, this.plugin)));
  }
}

/** Modal listing soft-deleted tags (settings.deletedTags) with a 恢复 button each.
 *  Restoring splices the tag out and persists via saveSettings (which also rebuilds
 *  the index and refreshes the open view so the tag reappears in the sidebar),
 *  then re-renders the list. Same Modal/Setting idiom as the view's dialogs. */
function manageDeletedTagsDialog(app: App, host: QuickMemoSettingsHost): void {
  const modal = new Modal(app);
  modal.setTitle('管理已删除标签');
  const listEl = modal.contentEl.createDiv();

  const renderRows = (): void => {
    listEl.empty();
    const tags = host.settings.deletedTags;
    if (tags.length === 0) {
      listEl.createEl('p', { text: '没有已删除的标签。右键侧栏标签即可删除（隐藏）。' });
      return;
    }
    for (const tag of tags) {
      new Setting(listEl)
        .setName(tag)
        .addButton((button) => button
          .setButtonText('恢复')
          .onClick(async () => {
            host.settings.deletedTags = host.settings.deletedTags.filter((t) => t !== tag);
            await host.saveSettings();
            renderRows();
          }));
    }
  };

  renderRows();
  modal.open();
}
