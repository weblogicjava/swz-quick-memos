import type { SettingDefinitionItem } from 'obsidian';

/**
 * Declarative setting definitions for Obsidian 1.13.0+. On 1.13.0+ the framework
 * renders these controls and indexes them for the unified settings search; the
 * imperative `QuickMemoSettingTab.display()` is the fallback for older versions.
 *
 * Each `key` is a `QuickMemoSettings` property name; names/descs/options mirror
 * `display()` so both paths look identical. Pure data (type-only Obsidian import)
 * so it is unit-testable without the Obsidian runtime.
 */
export function quickMemoSettingDefinitions(): SettingDefinitionItem[] {
  return [
    { name: '用户名称', desc: '显示在总览页左侧。', control: { type: 'text', key: 'userName' } },
    { name: 'Slogan', desc: '显示在用户名称下方。', control: { type: 'text', key: 'userSlogan' } },
    { name: '头像路径或 URL', desc: '可以填写 vault 内图片路径或外部 URL。', control: { type: 'text', key: 'avatar' } },
    { name: 'Quick Memo 标题', desc: '插件只读写这个二级标题下的记录。', control: { type: 'text', key: 'quickMemoHeading' } },
    {
      name: '使用自定义日记路径',
      desc: '开启后忽略 Obsidian Daily Notes 配置，按下面的文件夹和日期格式定位文件。推荐开启，定位最稳定。',
      control: { type: 'toggle', key: 'overrideDailyNotesConfig' },
    },
    { name: '日记文件夹', desc: '记录写入的文件夹，例如 每日工作。', control: { type: 'text', key: 'fallbackDailyNotesFolder' } },
    {
      name: '日期格式',
      desc: '支持 YYYY、MM、DD。例如 YYYY/MM/YYYY-MM-DD 会生成 2026/06/2026-06-19-quick-memos.md。',
      control: { type: 'text', key: 'fallbackDateFormat' },
    },
    {
      name: '启用块 ID',
      desc: '默认开启以获得稳定编辑、勾选和块链接；关闭后进入纯净 Markdown 模式。',
      control: { type: 'toggle', key: 'enableBlockIds' },
    },
    {
      name: '默认记录类型',
      control: { type: 'dropdown', key: 'defaultRecordType', options: { record: '记录', flash: '闪念', todo: '待办' } },
    },
    {
      name: '记录排序',
      control: { type: 'dropdown', key: 'sortDirection', options: { desc: '最新在上', asc: '最早在上' } },
    },
  ];
}
