# Obsidian Quick Memo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Markdown-native Obsidian plugin for quick daily records, flash thoughts, todos, history filtering, and heatmap statistics backed by Daily Note Markdown files.

**Architecture:** Daily Note Markdown is the only source of truth; plugin services parse and mutate only the configured `## Quick Memo` section. A rebuildable index powers search, filters, timeline display, and heatmap aggregation, while the UI calls repository/index services instead of editing files directly.

**Tech Stack:** TypeScript, Obsidian Plugin API, esbuild, Vitest, jsdom, no production UI framework.

---

## Source References

- Approved spec: `docs/superpowers/specs/2026-06-18-obsidian-quick-memo-design.md`
- Obsidian view pattern: register a view in `onload()`, create/focus a `WorkspaceLeaf`, call `workspace.revealLeaf(leaf)`.
- Obsidian settings pattern: `loadData()`, merge with defaults, `saveData()`, `PluginSettingTab`.
- Obsidian commands/ribbon: `this.addCommand({ id, name, callback })`, `this.addRibbonIcon(icon, tooltip, callback)`.
- UI/UX planning source: `ui-ux-pro-max` design-system search for “Obsidian plugin productivity dashboard note taking markdown heatmap minimal professional”.

## Overview UI/UX Styling Contract

Use `ui-ux-pro-max` guidance when implementing the overview page styles. The target style is a compact, data-dense productivity dashboard that still feels native inside Obsidian.

- Layout: three-column desktop dashboard; collapse to one column below `900px` to avoid horizontal scroll.
- Visual style: minimal, professional, low-ornament UI with clear grouping for profile/filter, composer/timeline, and heatmap areas.
- Obsidian compatibility: `styles.css` must use Obsidian theme variables such as `--background-primary`, `--background-secondary`, `--background-modifier-border`, `--text-normal`, `--text-muted`, `--interactive-accent`, and `--interactive-accent-hover`. Do not hard-code app-wide background or text colors.
- Accessibility: preserve visible focus states, keyboard tab order, 44px-ish interactive targets where space allows, and text contrast compatible with Obsidian light/dark themes.
- Motion: only use subtle color/border/opacity transitions around 150-200ms, and disable them under `prefers-reduced-motion: reduce`.
- Heatmap: use `--interactive-accent` intensity levels plus numeric `title` tooltips; do not rely on color alone for meaning in acceptance checks.
- Icons: avoid emoji icons in UI controls; use text labels or Obsidian/Lucide-style icons when icons are later added.

## File Structure

Create this project from an empty directory:

```text
.
├── .gitignore
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── vitest.config.ts
├── styles.css
├── src
│   ├── constants.ts
│   ├── main.ts
│   ├── types.ts
│   ├── settings
│   │   ├── settings.ts
│   │   └── SettingsTab.ts
│   ├── daily-notes
│   │   ├── DailyNoteResolver.ts
│   │   └── obsidianInternal.ts
│   ├── markdown
│   │   ├── QuickMemoParser.ts
│   │   ├── MarkdownRecordRepository.ts
│   │   └── id.ts
│   ├── index
│   │   └── IndexService.ts
│   ├── view
│   │   ├── QuickMemoView.ts
│   │   ├── render.ts
│   │   └── viewState.ts
│   └── test
│       ├── fakeVault.ts
│       └── fixtures.ts
└── tests
    ├── QuickMemoParser.test.ts
    ├── DailyNoteResolver.test.ts
    ├── MarkdownRecordRepository.test.ts
    ├── IndexService.test.ts
    └── viewState.test.ts
```

Responsibilities:

- `src/main.ts`: plugin bootstrap only; commands, ribbon, view, settings tab, file event wiring.
- `src/types.ts`: shared domain types and settings interfaces.
- `src/settings/*`: defaults, settings load/save helper, settings UI.
- `src/daily-notes/*`: resolve date file paths from Daily Notes internal config or plugin fallback.
- `src/markdown/*`: parse, serialize, append, update, toggle, delete Quick Memo records.
- `src/index/*`: rebuildable in-memory/persisted index and queries.
- `src/view/*`: UI state and DOM rendering for the three-column overview.
- `src/test/*`: fake vault and fixtures used by service tests.
- `tests/*`: Vitest coverage for parser, resolver, repository, index, and pure view-state helpers.

## Implementation Tasks

### Task 1: Scaffold the Obsidian Plugin Project

**Files:**
- Create: `.gitignore`
- Create: `manifest.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/constants.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Initialize git repository**

Run:

```bash
git init
```

Expected: command prints `Initialized empty Git repository` or `Reinitialized existing Git repository`.

- [ ] **Step 2: Create `.gitignore`**

Write `.gitignore`:

```gitignore
node_modules/
dist/
main.js
*.map
coverage/
.DS_Store
.obsidian/
.vault-test/
```

- [ ] **Step 3: Create `manifest.json`**

Write `manifest.json`:

```json
{
  "id": "obsidian-quick-memo",
  "name": "Quick Memo",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Markdown-native daily quick records, flash thoughts, todos, history, filters, and heatmap.",
  "author": "songwz",
  "authorUrl": "",
  "isDesktopOnly": false
}
```

- [ ] **Step 4: Create `package.json`**

Write `package.json`:

```json
{
  "name": "obsidian-quick-memo",
  "version": "0.1.0",
  "description": "Markdown-native Obsidian quick memo plugin",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs --watch",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -noEmit -skipLibCheck"
  },
  "keywords": [
    "obsidian",
    "plugin",
    "memo",
    "daily-notes"
  ],
  "author": "songwz",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.14.10",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.23.0",
    "obsidian": "latest",
    "tslib": "^2.6.3",
    "typescript": "^5.5.3",
    "vitest": "^1.6.0",
    "jsdom": "^24.1.0"
  }
}
```

- [ ] **Step 5: Create `tsconfig.json`**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2020",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2020"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 6: Create `esbuild.config.mjs`**

Write `esbuild.config.mjs`:

```js
import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/* obsidian-quick-memo */`;
const prod = process.argv[2] === 'production';
const watch = process.argv.includes('--watch');

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/autocomplete', '@codemirror/collab', '@codemirror/commands', '@codemirror/language', '@codemirror/lint', '@codemirror/search', '@codemirror/state', '@codemirror/view', '@lezer/common', '@lezer/highlight', '@lezer/lr', ...builtins],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
});

if (watch) {
  await context.watch();
  console.log('watching...');
} else {
  await context.rebuild();
  await context.dispose();
}
```

- [ ] **Step 7: Create `vitest.config.ts`**

Write `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 8: Create shared constants and types**

Write `src/constants.ts`:

```ts
export const VIEW_TYPE_QUICK_MEMO = 'quick-memo-overview';
export const DEFAULT_QUICK_MEMO_HEADING = 'Quick Memo';
export const BLOCK_ID_PREFIX = 'oqm';
```

Write `src/types.ts`:

```ts
export type QuickMemoType = 'record' | 'flash' | 'todo';
export type SortDirection = 'asc' | 'desc';
export type DateRangePreset = 'today' | '7d' | '30d' | 'custom';

export interface QuickMemoSettings {
  userName: string;
  userSlogan: string;
  avatar: string;
  quickMemoHeading: string;
  fallbackDailyNotesFolder: string;
  fallbackDateFormat: string;
  enableBlockIds: boolean;
  defaultRecordType: QuickMemoType;
  sortDirection: SortDirection;
}

export interface RecordDraft {
  date: string;
  time: string;
  type: QuickMemoType;
  content: string;
  body?: string;
  tags?: string[];
  completed?: boolean;
}

export interface WeakRecordLocator {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  date: string;
  time: string;
  contentHash: string;
}

export interface QuickMemoRecord {
  id?: string;
  date: string;
  time: string;
  type: QuickMemoType;
  content: string;
  body?: string;
  tags: string[];
  completed?: boolean;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  hasStableId: boolean;
  raw: string;
  contentHash: string;
}

export interface ParseWarning {
  filePath: string;
  line: number;
  message: string;
  raw: string;
}

export interface ParseResult {
  records: QuickMemoRecord[];
  warnings: ParseWarning[];
}

export interface DateFileResolution {
  date: string;
  filePath: string;
  source: 'daily-notes' | 'fallback';
}

export interface IndexQuery {
  text?: string;
  types?: QuickMemoType[];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  completed?: boolean;
}

export interface HeatmapDay {
  date: string;
  count: number;
}
```

- [ ] **Step 9: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` appears.

- [ ] **Step 10: Run baseline checks**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected: typecheck passes, Vitest reports no tests or zero test files without failure, build creates `main.js`.

- [ ] **Step 11: Commit scaffold**

Run:

```bash
git add .gitignore manifest.json package.json package-lock.json tsconfig.json esbuild.config.mjs vitest.config.ts src/constants.ts src/types.ts
git commit -m "chore: scaffold Obsidian quick memo plugin"
```

Expected: commit succeeds.

### Task 2: Add Settings Defaults and Settings Service

**Files:**
- Create: `src/settings/settings.ts`
- Test: `tests/settings.test.ts`

- [ ] **Step 1: Write failing settings tests**

Create `tests/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings/settings';

const saved = {
  userName: 'Ada',
  userSlogan: 'Capture ideas fast',
  avatar: 'avatar.png',
  quickMemoHeading: 'Memos',
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
      fallbackDailyNotesFolder: 'Daily Notes',
      fallbackDateFormat: 'YYYY-MM-DD',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/settings.test.ts
```

Expected: FAIL because `src/settings/settings.ts` does not exist.

- [ ] **Step 3: Implement settings defaults**

Create `src/settings/settings.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/settings.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit settings service**

Run:

```bash
git add src/settings/settings.ts tests/settings.test.ts
git commit -m "feat: add quick memo settings defaults"
```

Expected: commit succeeds.

### Task 3: Implement Block ID and Content Hash Helpers

**Files:**
- Create: `src/markdown/id.ts`
- Test: `tests/id.test.ts`

- [ ] **Step 1: Write failing ID helper tests**

Create `tests/id.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contentHash, createBlockId, extractBlockId, stripBlockId } from '../src/markdown/id';

describe('id helpers', () => {
  it('creates deterministic block ids from date, time, and suffix', () => {
    expect(createBlockId('2026-06-18', '09:12', 'a1b2')).toBe('oqm-20260618-091200-a1b2');
  });

  it('extracts and strips quick memo block ids', () => {
    const line = '- 09:12 [闪念] idea #tag ^oqm-20260618-091200-a1b2';
    expect(extractBlockId(line)).toBe('oqm-20260618-091200-a1b2');
    expect(stripBlockId(line)).toBe('- 09:12 [闪念] idea #tag');
  });

  it('ignores non quick memo block ids', () => {
    expect(extractBlockId('- text ^not-ours')).toBeUndefined();
  });

  it('hashes equivalent whitespace consistently', () => {
    expect(contentHash(' hello\nworld ')).toBe(contentHash('hello world'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/id.test.ts
```

Expected: FAIL because `src/markdown/id.ts` does not exist.

- [ ] **Step 3: Implement ID helper**

Create `src/markdown/id.ts`:

```ts
import { BLOCK_ID_PREFIX } from '../constants';

const QUICK_MEMO_BLOCK_ID = /\s\^(oqm-[0-9]{8}-[0-9]{6}-[a-z0-9]+)\s*$/u;

export function createBlockId(date: string, time: string, suffix: string): string {
  const compactDate = date.replace(/[^0-9]/gu, '');
  const compactTime = time.replace(/[^0-9]/gu, '').padEnd(6, '0').slice(0, 6);
  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/gu, '').slice(0, 8) || '0000';
  return `${BLOCK_ID_PREFIX}-${compactDate}-${compactTime}-${safeSuffix}`;
}

export function randomIdSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function extractBlockId(text: string): string | undefined {
  return text.match(QUICK_MEMO_BLOCK_ID)?.[1];
}

export function stripBlockId(text: string): string {
  return text.replace(QUICK_MEMO_BLOCK_ID, '').trimEnd();
}

export function contentHash(text: string): string {
  const normalized = text.trim().replace(/\s+/gu, ' ');
  let hash = 5381;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/id.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit ID helpers**

Run:

```bash
git add src/markdown/id.ts tests/id.test.ts
git commit -m "feat: add quick memo id helpers"
```

Expected: commit succeeds.

### Task 4: Implement Markdown Parser and Serializer

**Files:**
- Create: `src/markdown/QuickMemoParser.ts`
- Create: `src/test/fixtures.ts`
- Test: `tests/QuickMemoParser.test.ts`

- [ ] **Step 1: Write parser fixtures**

Create `src/test/fixtures.ts`:

```ts
export const DAILY_NOTE_WITH_MEMOS = `# 2026-06-18

Morning pages outside plugin.

## Quick Memo

- 09:12 [闪念] 插件总览页布局可以做成三栏 #obsidian ^oqm-20260618-091200-a1b2
  中间是输入区和记录流。
  右侧是热力图。
- 10:05 [记录] 今天开始整理插件需求 #project ^oqm-20260618-100500-c3d4
- [ ] 10:20 [待办] 写第一版设计文档 #todo ^oqm-20260618-102000-e5f6
- [x] 11:00 [待办] 已完成任务 #done ^oqm-20260618-110000-f7g8

## Other Section

- Should not be indexed #outside
`;

export const DAILY_NOTE_WITHOUT_MEMOS = `# 2026-06-19

No plugin content yet.
`;
```

- [ ] **Step 2: Write failing parser tests**

Create `tests/QuickMemoParser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DAILY_NOTE_WITH_MEMOS, DAILY_NOTE_WITHOUT_MEMOS } from '../src/test/fixtures';
import { QuickMemoParser } from '../src/markdown/QuickMemoParser';

describe('QuickMemoParser', () => {
  const parser = new QuickMemoParser('Quick Memo');

  it('parses records only inside the Quick Memo section', () => {
    const result = parser.parseFile('Daily Notes/2026-06-18.md', '2026-06-18', DAILY_NOTE_WITH_MEMOS);
    expect(result.warnings).toEqual([]);
    expect(result.records).toHaveLength(4);
    expect(result.records.map((record) => record.type)).toEqual(['flash', 'record', 'todo', 'todo']);
    expect(result.records[0]).toMatchObject({
      id: 'oqm-20260618-091200-a1b2',
      date: '2026-06-18',
      time: '09:12',
      type: 'flash',
      content: '插件总览页布局可以做成三栏 #obsidian',
      body: '中间是输入区和记录流。\n右侧是热力图。',
      tags: ['#obsidian'],
      filePath: 'Daily Notes/2026-06-18.md',
      lineStart: 5,
      lineEnd: 7,
      hasStableId: true,
    });
    expect(result.records[2].completed).toBe(false);
    expect(result.records[3].completed).toBe(true);
  });

  it('returns no records when the section is missing', () => {
    expect(parser.parseFile('Daily Notes/2026-06-19.md', '2026-06-19', DAILY_NOTE_WITHOUT_MEMOS)).toEqual({ records: [], warnings: [] });
  });

  it('parses pure markdown records without ids', () => {
    const markdown = '## Quick Memo\n\n- 08:00 [记录] clean line #plain\n';
    const result = parser.parseFile('Daily Notes/2026-06-20.md', '2026-06-20', markdown);
    expect(result.records[0]).toMatchObject({
      id: undefined,
      hasStableId: false,
      content: 'clean line #plain',
      tags: ['#plain'],
    });
  });

  it('serializes drafts into list item markdown with optional block id', () => {
    expect(parser.serializeRecord({ date: '2026-06-18', time: '09:12', type: 'flash', content: 'hello #tag', body: 'line 2' }, 'oqm-20260618-091200-a1b2')).toBe('- 09:12 [闪念] hello #tag ^oqm-20260618-091200-a1b2\n  line 2');
    expect(parser.serializeRecord({ date: '2026-06-18', time: '10:20', type: 'todo', content: 'task', completed: false }, undefined)).toBe('- [ ] 10:20 [待办] task');
    expect(parser.serializeRecord({ date: '2026-06-18', time: '10:20', type: 'todo', content: 'task', completed: true }, 'oqm-20260618-102000-e5f6')).toBe('- [x] 10:20 [待办] task ^oqm-20260618-102000-e5f6');
  });
});
```

- [ ] **Step 3: Run parser test to verify it fails**

Run:

```bash
npm test -- tests/QuickMemoParser.test.ts
```

Expected: FAIL because `QuickMemoParser` does not exist.

- [ ] **Step 4: Implement parser and serializer**

Create `src/markdown/QuickMemoParser.ts`:

```ts
import type { ParseResult, ParseWarning, QuickMemoRecord, QuickMemoType, RecordDraft } from '../types';
import { contentHash, extractBlockId, stripBlockId } from './id';

const TYPE_LABELS: Record<QuickMemoType, string> = {
  record: '记录',
  flash: '闪念',
  todo: '待办',
};

const LABEL_TYPES: Record<string, QuickMemoType> = {
  记录: 'record',
  闪念: 'flash',
  待办: 'todo',
};

const TASK_RE = /^- \[( |x|X)\] ([0-9]{2}:[0-9]{2}) \[(记录|闪念|待办)\] (.*)$/u;
const LIST_RE = /^- ([0-9]{2}:[0-9]{2}) \[(记录|闪念|待办)\] (.*)$/u;
const TAG_RE = /(^|\s)(#[\p{L}\p{N}_\-\/]+)/gu;

export class QuickMemoParser {
  constructor(private readonly heading: string) {}

  parseFile(filePath: string, date: string, markdown: string): ParseResult {
    const lines = markdown.split('\n');
    const section = this.findSection(lines);
    if (!section) return { records: [], warnings: [] };

    const records: QuickMemoRecord[] = [];
    const warnings: ParseWarning[] = [];
    let index = section.start;

    while (index < section.end) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      if (!line.startsWith('- ')) {
        warnings.push({ filePath, line: index + 1, message: 'Non-list content inside Quick Memo section was ignored.', raw: line });
        index += 1;
        continue;
      }

      const bodyLines: string[] = [];
      let lineEnd = index;
      let next = index + 1;
      while (next < section.end && isIndentedContinuation(lines[next])) {
        bodyLines.push(lines[next].replace(/^ {2}/u, ''));
        lineEnd = next;
        next += 1;
      }

      const parsed = this.parseRecordLine(line, bodyLines.join('\n'), filePath, date, index + 1, lineEnd + 1);
      if (parsed) {
        records.push(parsed);
      } else {
        warnings.push({ filePath, line: index + 1, message: 'Quick Memo list item did not match a supported record format.', raw: line });
      }
      index = next;
    }

    return { records, warnings };
  }

  serializeRecord(draft: RecordDraft, id: string | undefined): string {
    const label = TYPE_LABELS[draft.type];
    const content = draft.content.trim();
    const idPart = id ? ` ^${id}` : '';
    const firstLine = draft.type === 'todo'
      ? `- [${draft.completed ? 'x' : ' '}] ${draft.time} [${label}] ${content}${idPart}`
      : `- ${draft.time} [${label}] ${content}${idPart}`;

    if (!draft.body?.trim()) return firstLine;

    const body = draft.body
      .replace(/\r\n/gu, '\n')
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    return `${firstLine}\n${body}`;
  }

  private parseRecordLine(line: string, body: string, filePath: string, date: string, lineStart: number, lineEnd: number): QuickMemoRecord | undefined {
    const withoutId = stripBlockId(line);
    const id = extractBlockId(line);
    const taskMatch = withoutId.match(TASK_RE);
    const listMatch = withoutId.match(LIST_RE);
    const match = taskMatch ?? listMatch;
    if (!match) return undefined;

    const isTask = Boolean(taskMatch);
    const time = isTask ? match[2] : match[1];
    const label = isTask ? match[3] : match[2];
    const content = isTask ? match[4] : match[3];
    const type = LABEL_TYPES[label];
    const raw = body ? `${line}\n${body}` : line;

    return {
      id,
      date,
      time,
      type,
      content: content.trim(),
      body: body.trim() ? body : undefined,
      tags: extractTags(`${content}\n${body}`),
      completed: type === 'todo' ? match[1].toLowerCase() === 'x' : undefined,
      filePath,
      lineStart,
      lineEnd,
      hasStableId: Boolean(id),
      raw,
      contentHash: contentHash(`${time} ${label} ${content} ${body}`),
    };
  }

  private findSection(lines: string[]): { start: number; end: number } | undefined {
    const headingPattern = new RegExp(`^##\\s+${escapeRegExp(this.heading)}\\s*$`, 'u');
    const startHeading = lines.findIndex((line) => headingPattern.test(line));
    if (startHeading === -1) return undefined;

    let end = lines.length;
    for (let index = startHeading + 1; index < lines.length; index += 1) {
      if (/^##\s+/u.test(lines[index])) {
        end = index;
        break;
      }
    }
    return { start: startHeading + 1, end };
  }
}

function isIndentedContinuation(line: string): boolean {
  return line.startsWith('  ') || line.trim() === '';
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(TAG_RE)) {
    tags.add(match[2]);
  }
  return Array.from(tags);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
```

- [ ] **Step 5: Run parser tests**

Run:

```bash
npm test -- tests/QuickMemoParser.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit parser**

Run:

```bash
git add src/markdown/QuickMemoParser.ts src/test/fixtures.ts tests/QuickMemoParser.test.ts
git commit -m "feat: parse quick memo markdown records"
```

Expected: commit succeeds.

### Task 5: Implement Fake Vault Test Harness

**Files:**
- Create: `src/test/fakeVault.ts`
- Test: `tests/fakeVault.test.ts`

- [ ] **Step 1: Write fake vault tests**

Create `tests/fakeVault.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FakeVault } from '../src/test/fakeVault';

describe('FakeVault', () => {
  it('creates, reads, modifies, and lists markdown files', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': 'hello' });
    expect(await vault.read('Daily Notes/2026-06-18.md')).toBe('hello');

    await vault.modify('Daily Notes/2026-06-18.md', 'updated');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toBe('updated');

    await vault.create('Daily Notes/2026-06-19.md', 'new');
    expect(vault.exists('Daily Notes/2026-06-19.md')).toBe(true);
    expect(vault.listMarkdownFiles()).toEqual(['Daily Notes/2026-06-18.md', 'Daily Notes/2026-06-19.md']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/fakeVault.test.ts
```

Expected: FAIL because `FakeVault` does not exist.

- [ ] **Step 3: Implement fake vault**

Create `src/test/fakeVault.ts`:

```ts
export interface VaultLike {
  read(path: string): Promise<string>;
  modify(path: string, content: string): Promise<void>;
  create(path: string, content: string): Promise<void>;
  exists(path: string): boolean;
  listMarkdownFiles(): string[];
  stat(path: string): { mtime: number } | undefined;
}

export class FakeVault implements VaultLike {
  private files = new Map<string, { content: string; mtime: number }>();
  private clock = 1;

  constructor(initialFiles: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(path, { content, mtime: this.clock++ });
    }
  }

  async read(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file.content;
  }

  async modify(path: string, content: string): Promise<void> {
    if (!this.files.has(path)) throw new Error(`File not found: ${path}`);
    this.files.set(path, { content, mtime: this.clock++ });
  }

  async create(path: string, content: string): Promise<void> {
    if (this.files.has(path)) throw new Error(`File already exists: ${path}`);
    this.files.set(path, { content, mtime: this.clock++ });
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  listMarkdownFiles(): string[] {
    return Array.from(this.files.keys()).filter((path) => path.endsWith('.md')).sort();
  }

  stat(path: string): { mtime: number } | undefined {
    return this.files.get(path);
  }
}
```

- [ ] **Step 4: Run fake vault tests**

Run:

```bash
npm test -- tests/fakeVault.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit fake vault**

Run:

```bash
git add src/test/fakeVault.ts tests/fakeVault.test.ts
git commit -m "test: add fake vault harness"
```

Expected: commit succeeds.

### Task 6: Implement Daily Note Resolver

**Files:**
- Create: `src/daily-notes/obsidianInternal.ts`
- Create: `src/daily-notes/DailyNoteResolver.ts`
- Test: `tests/DailyNoteResolver.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Create `tests/DailyNoteResolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DailyNoteResolver } from '../src/daily-notes/DailyNoteResolver';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import { FakeVault } from '../src/test/fakeVault';

describe('DailyNoteResolver', () => {
  it('uses fallback folder and date format when Daily Notes config is absent', async () => {
    const vault = new FakeVault();
    const resolver = new DailyNoteResolver(vault, undefined, DEFAULT_SETTINGS);
    const result = await resolver.resolve('2026-06-18');
    expect(result).toEqual({ date: '2026-06-18', filePath: 'Daily Notes/2026-06-18.md', source: 'fallback' });
  });

  it('uses daily notes config when present', async () => {
    const vault = new FakeVault();
    const resolver = new DailyNoteResolver(vault, { folder: 'Journal', format: 'YYYY/MM/DD' }, DEFAULT_SETTINGS);
    const result = await resolver.resolve('2026-06-18');
    expect(result).toEqual({ date: '2026-06-18', filePath: 'Journal/2026/06/18.md', source: 'daily-notes' });
  });

  it('creates missing files and appends Quick Memo heading', async () => {
    const vault = new FakeVault();
    const resolver = new DailyNoteResolver(vault, undefined, DEFAULT_SETTINGS);
    const path = await resolver.ensureDailyNote('2026-06-18');
    expect(path).toBe('Daily Notes/2026-06-18.md');
    expect(await vault.read(path)).toBe('\n## Quick Memo\n');
  });

  it('adds Quick Memo heading to existing files without one', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '# 2026-06-18\nBody\n' });
    const resolver = new DailyNoteResolver(vault, undefined, DEFAULT_SETTINGS);
    await resolver.ensureDailyNote('2026-06-18');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toBe('# 2026-06-18\nBody\n\n## Quick Memo\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/DailyNoteResolver.test.ts
```

Expected: FAIL because resolver files do not exist.

- [ ] **Step 3: Implement Daily Notes internal config helper**

Create `src/daily-notes/obsidianInternal.ts`:

```ts
import type { App } from 'obsidian';

export interface DailyNotesConfig {
  folder?: string;
  format?: string;
}

interface InternalDailyNotesPlugin {
  instance?: {
    options?: {
      folder?: string;
      format?: string;
    };
  };
}

interface AppWithInternalPlugins extends App {
  internalPlugins?: {
    plugins?: {
      'daily-notes'?: InternalDailyNotesPlugin;
    };
  };
}

export function getDailyNotesConfig(app: App): DailyNotesConfig | undefined {
  const dailyNotes = (app as AppWithInternalPlugins).internalPlugins?.plugins?.['daily-notes'];
  const options = dailyNotes?.instance?.options;
  if (!options) return undefined;
  return {
    folder: options.folder,
    format: options.format,
  };
}
```

- [ ] **Step 4: Implement DailyNoteResolver**

Create `src/daily-notes/DailyNoteResolver.ts`:

```ts
import type { DateFileResolution, QuickMemoSettings } from '../types';
import type { VaultLike } from '../test/fakeVault';
import type { DailyNotesConfig } from './obsidianInternal';

export class DailyNoteResolver {
  constructor(
    private readonly vault: VaultLike,
    private readonly dailyNotesConfig: DailyNotesConfig | undefined,
    private readonly settings: QuickMemoSettings,
  ) {}

  async resolve(date: string): Promise<DateFileResolution> {
    const config = this.dailyNotesConfig;
    const hasDailyNotesConfig = Boolean(config?.folder || config?.format);
    const folder = trimSlashes(hasDailyNotesConfig ? config?.folder ?? '' : this.settings.fallbackDailyNotesFolder);
    const format = hasDailyNotesConfig ? config?.format ?? this.settings.fallbackDateFormat : this.settings.fallbackDateFormat;
    const relative = `${formatDate(date, format)}.md`;
    return {
      date,
      filePath: folder ? `${folder}/${relative}` : relative,
      source: hasDailyNotesConfig ? 'daily-notes' : 'fallback',
    };
  }

  async ensureDailyNote(date: string): Promise<string> {
    const resolution = await this.resolve(date);
    const heading = `## ${this.settings.quickMemoHeading}`;

    if (!this.vault.exists(resolution.filePath)) {
      await this.vault.create(resolution.filePath, `\n${heading}\n`);
      return resolution.filePath;
    }

    const content = await this.vault.read(resolution.filePath);
    const headingPattern = new RegExp(`^##\\s+${escapeRegExp(this.settings.quickMemoHeading)}\\s*$`, 'mu');
    if (!headingPattern.test(content)) {
      const separator = content.endsWith('\n') ? '\n' : '\n\n';
      await this.vault.modify(resolution.filePath, `${content}${separator}${heading}\n`);
    }

    return resolution.filePath;
  }
}

export function formatDate(date: string, format: string): string {
  const [year, month, day] = date.split('-');
  return format
    .replace(/YYYY/gu, year)
    .replace(/MM/gu, month)
    .replace(/DD/gu, day);
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/gu, '');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
```

- [ ] **Step 5: Run resolver tests**

Run:

```bash
npm test -- tests/DailyNoteResolver.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit resolver**

Run:

```bash
git add src/daily-notes/obsidianInternal.ts src/daily-notes/DailyNoteResolver.ts tests/DailyNoteResolver.test.ts
git commit -m "feat: resolve daily note files"
```

Expected: commit succeeds.

### Task 7: Implement Markdown Record Repository

**Files:**
- Create: `src/markdown/MarkdownRecordRepository.ts`
- Test: `tests/MarkdownRecordRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Create `tests/MarkdownRecordRepository.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DailyNoteResolver } from '../src/daily-notes/DailyNoteResolver';
import { MarkdownRecordRepository } from '../src/markdown/MarkdownRecordRepository';
import { QuickMemoParser } from '../src/markdown/QuickMemoParser';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import { FakeVault } from '../src/test/fakeVault';

describe('MarkdownRecordRepository', () => {
  it('appends records to the Quick Memo section', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '# Day\n\n## Quick Memo\n' });
    const repo = makeRepo(vault);
    await repo.appendRecord({ date: '2026-06-18', time: '09:12', type: 'flash', content: 'idea #tag', body: 'line 2' }, 'a1b2');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 09:12 [闪念] idea #tag ^oqm-20260618-091200-a1b2\n  line 2');
  });

  it('respects pure markdown mode when block ids are disabled', async () => {
    const vault = new FakeVault();
    const settings = { ...DEFAULT_SETTINGS, enableBlockIds: false };
    const repo = makeRepo(vault, settings);
    await repo.appendRecord({ date: '2026-06-18', time: '10:00', type: 'record', content: 'plain' }, 'a1b2');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 10:00 [记录] plain');
    expect(await vault.read('Daily Notes/2026-06-18.md')).not.toContain('^oqm-');
  });

  it('toggles todo completion by stable id', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- [ ] 10:20 [待办] task #todo ^oqm-20260618-102000-e5f6\n' });
    const repo = makeRepo(vault);
    await repo.toggleTodo('oqm-20260618-102000-e5f6');
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- [x] 10:20 [待办] task #todo ^oqm-20260618-102000-e5f6');
  });

  it('updates record content and preserves time and id', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- 09:12 [闪念] old ^oqm-20260618-091200-a1b2\n' });
    const repo = makeRepo(vault);
    await repo.updateRecord('oqm-20260618-091200-a1b2', { type: 'record', content: 'new #tag', body: 'body' });
    expect(await vault.read('Daily Notes/2026-06-18.md')).toContain('- 09:12 [记录] new #tag ^oqm-20260618-091200-a1b2\n  body');
  });

  it('deletes a record and its indented body', async () => {
    const vault = new FakeVault({ 'Daily Notes/2026-06-18.md': '## Quick Memo\n\n- 09:12 [闪念] remove ^oqm-20260618-091200-a1b2\n  body\n- 10:00 [记录] keep ^oqm-20260618-100000-b2\n' });
    const repo = makeRepo(vault);
    await repo.deleteRecord('oqm-20260618-091200-a1b2');
    const content = await vault.read('Daily Notes/2026-06-18.md');
    expect(content).not.toContain('remove');
    expect(content).toContain('keep');
  });
});

function makeRepo(vault: FakeVault, settings = DEFAULT_SETTINGS): MarkdownRecordRepository {
  const resolver = new DailyNoteResolver(vault, undefined, settings);
  return new MarkdownRecordRepository(vault, resolver, new QuickMemoParser(settings.quickMemoHeading), settings);
}
```

- [ ] **Step 2: Run repository tests to verify they fail**

Run:

```bash
npm test -- tests/MarkdownRecordRepository.test.ts
```

Expected: FAIL because repository does not exist.

- [ ] **Step 3: Implement repository**

Create `src/markdown/MarkdownRecordRepository.ts`:

```ts
import type { QuickMemoRecord, QuickMemoSettings, QuickMemoType, RecordDraft } from '../types';
import type { VaultLike } from '../test/fakeVault';
import type { DailyNoteResolver } from '../daily-notes/DailyNoteResolver';
import type { QuickMemoParser } from './QuickMemoParser';
import { createBlockId } from './id';

export class MarkdownRecordRepository {
  constructor(
    private readonly vault: VaultLike,
    private readonly resolver: DailyNoteResolver,
    private readonly parser: QuickMemoParser,
    private readonly settings: QuickMemoSettings,
  ) {}

  async appendRecord(draft: RecordDraft, idSuffix: string): Promise<QuickMemoRecord> {
    const filePath = await this.resolver.ensureDailyNote(draft.date);
    const content = await this.vault.read(filePath);
    const id = this.settings.enableBlockIds ? createBlockId(draft.date, draft.time, idSuffix) : undefined;
    const serialized = this.parser.serializeRecord(draft, id);
    const updated = insertIntoSection(content, this.settings.quickMemoHeading, serialized);
    await this.vault.modify(filePath, updated);
    const parsed = this.parser.parseFile(filePath, draft.date, updated).records;
    return parsed.find((record) => record.id === id) ?? parsed[parsed.length - 1];
  }

  async readRecords(date: string): Promise<QuickMemoRecord[]> {
    const resolution = await this.resolver.resolve(date);
    if (!this.vault.exists(resolution.filePath)) return [];
    const content = await this.vault.read(resolution.filePath);
    return this.parser.parseFile(resolution.filePath, date, content).records;
  }

  async updateRecord(id: string, changes: { type?: QuickMemoType; content?: string; body?: string; completed?: boolean }): Promise<void> {
    const located = await this.locateById(id);
    const nextDraft: RecordDraft = {
      date: located.record.date,
      time: located.record.time,
      type: changes.type ?? located.record.type,
      content: changes.content ?? located.record.content,
      body: changes.body ?? located.record.body,
      completed: changes.completed ?? located.record.completed,
    };
    const replacement = this.parser.serializeRecord(nextDraft, located.record.id);
    await this.replaceLines(located.filePath, located.record.lineStart, located.record.lineEnd, replacement);
  }

  async toggleTodo(id: string): Promise<void> {
    const located = await this.locateById(id);
    if (located.record.type !== 'todo') throw new Error(`Record is not a todo: ${id}`);
    await this.updateRecord(id, { completed: !located.record.completed });
  }

  async deleteRecord(id: string): Promise<void> {
    const located = await this.locateById(id);
    await this.replaceLines(located.filePath, located.record.lineStart, located.record.lineEnd, '');
  }

  async backfillMissingIds(date: string): Promise<number> {
    const resolution = await this.resolver.resolve(date);
    if (!this.vault.exists(resolution.filePath)) return 0;
    let content = await this.vault.read(resolution.filePath);
    const records = this.parser.parseFile(resolution.filePath, date, content).records.filter((record) => !record.id);
    let count = 0;
    for (const record of records) {
      const id = createBlockId(record.date, record.time, record.contentHash.slice(0, 6));
      const lines = content.split('\n');
      lines[record.lineStart - 1] = `${lines[record.lineStart - 1]} ^${id}`;
      content = lines.join('\n');
      count += 1;
    }
    if (count > 0) await this.vault.modify(resolution.filePath, content);
    return count;
  }

  private async locateById(id: string): Promise<{ filePath: string; record: QuickMemoRecord }> {
    for (const filePath of this.vault.listMarkdownFiles()) {
      const date = dateFromPath(filePath);
      const content = await this.vault.read(filePath);
      const record = this.parser.parseFile(filePath, date, content).records.find((candidate) => candidate.id === id);
      if (record) return { filePath, record };
    }
    throw new Error(`Record not found: ${id}`);
  }

  private async replaceLines(filePath: string, lineStart: number, lineEnd: number, replacement: string): Promise<void> {
    const content = await this.vault.read(filePath);
    const lines = content.split('\n');
    const before = lines.slice(0, lineStart - 1);
    const after = lines.slice(lineEnd);
    const middle = replacement ? replacement.split('\n') : [];
    await this.vault.modify(filePath, [...before, ...middle, ...after].join('\n'));
  }
}

function insertIntoSection(markdown: string, heading: string, serialized: string): string {
  const lines = markdown.split('\n');
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'u');
  const headingIndex = lines.findIndex((line) => headingPattern.test(line));
  if (headingIndex === -1) {
    const separator = markdown.endsWith('\n') ? '' : '\n';
    return `${markdown}${separator}\n## ${heading}\n\n${serialized}\n`;
  }

  let insertAt = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/u.test(lines[index])) {
      insertAt = index;
      break;
    }
  }

  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  if (before[before.length - 1]?.trim()) before.push('');
  before.push(serialized);
  return [...before, ...after].join('\n');
}

function dateFromPath(path: string): string {
  const match = path.match(/([0-9]{4})[-\/]([0-9]{2})[-\/]([0-9]{2})\.md$/u);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '1970-01-01';
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
```

- [ ] **Step 4: Run repository tests**

Run:

```bash
npm test -- tests/MarkdownRecordRepository.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit repository**

Run:

```bash
git add src/markdown/MarkdownRecordRepository.ts tests/MarkdownRecordRepository.test.ts
git commit -m "feat: write quick memo records to markdown"
```

Expected: commit succeeds.

### Task 8: Implement Rebuildable Index Service

**Files:**
- Create: `src/index/IndexService.ts`
- Test: `tests/IndexService.test.ts`

- [ ] **Step 1: Write failing index tests**

Create `tests/IndexService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { IndexService } from '../src/index/IndexService';
import { QuickMemoParser } from '../src/markdown/QuickMemoParser';
import { DAILY_NOTE_WITH_MEMOS } from '../src/test/fixtures';
import { FakeVault } from '../src/test/fakeVault';

describe('IndexService', () => {
  it('rebuilds records, tags, and heatmap from markdown files', async () => {
    const vault = new FakeVault({
      'Daily Notes/2026-06-18.md': DAILY_NOTE_WITH_MEMOS,
      'Daily Notes/2026-06-19.md': '## Quick Memo\n\n- 08:00 [记录] second day #project ^oqm-20260619-080000-abcd\n',
    });
    const index = new IndexService(vault, new QuickMemoParser('Quick Memo'));
    await index.rebuild();

    expect(index.query({ tags: ['#project'] }).map((record) => record.date)).toEqual(['2026-06-18', '2026-06-19']);
    expect(index.query({ types: ['flash'] })).toHaveLength(1);
    expect(index.query({ text: '布局' })).toHaveLength(1);
    expect(index.heatmap()).toEqual([
      { date: '2026-06-18', count: 4 },
      { date: '2026-06-19', count: 1 },
    ]);
    expect(index.tags()).toEqual([
      ['#project', 2],
      ['#done', 1],
      ['#obsidian', 1],
      ['#todo', 1],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/IndexService.test.ts
```

Expected: FAIL because `IndexService` does not exist.

- [ ] **Step 3: Implement index service**

Create `src/index/IndexService.ts`:

```ts
import type { HeatmapDay, IndexQuery, QuickMemoRecord } from '../types';
import type { VaultLike } from '../test/fakeVault';
import type { QuickMemoParser } from '../markdown/QuickMemoParser';

export class IndexService {
  private records: QuickMemoRecord[] = [];
  private mtimes = new Map<string, number>();

  constructor(
    private readonly vault: VaultLike,
    private readonly parser: QuickMemoParser,
  ) {}

  async rebuild(): Promise<void> {
    const next: QuickMemoRecord[] = [];
    const nextMtimes = new Map<string, number>();

    for (const filePath of this.vault.listMarkdownFiles()) {
      const content = await this.vault.read(filePath);
      const date = dateFromPath(filePath);
      next.push(...this.parser.parseFile(filePath, date, content).records);
      nextMtimes.set(filePath, this.vault.stat(filePath)?.mtime ?? 0);
    }

    this.records = sortRecords(next, 'desc');
    this.mtimes = nextMtimes;
  }

  async refreshChangedFiles(): Promise<void> {
    const changed = this.vault.listMarkdownFiles().filter((filePath) => this.vault.stat(filePath)?.mtime !== this.mtimes.get(filePath));
    if (changed.length === 0) return;

    const unchanged = this.records.filter((record) => !changed.includes(record.filePath));
    const reparsed: QuickMemoRecord[] = [];
    for (const filePath of changed) {
      reparsed.push(...this.parser.parseFile(filePath, dateFromPath(filePath), await this.vault.read(filePath)).records);
      this.mtimes.set(filePath, this.vault.stat(filePath)?.mtime ?? 0);
    }
    this.records = sortRecords([...unchanged, ...reparsed], 'desc');
  }

  query(query: IndexQuery): QuickMemoRecord[] {
    const text = query.text?.trim().toLowerCase();
    return this.records.filter((record) => {
      if (query.startDate && record.date < query.startDate) return false;
      if (query.endDate && record.date > query.endDate) return false;
      if (query.types?.length && !query.types.includes(record.type)) return false;
      if (query.completed !== undefined && record.completed !== query.completed) return false;
      if (query.tags?.length && !query.tags.every((tag) => record.tags.includes(tag))) return false;
      if (text) {
        const haystack = `${record.content}\n${record.body ?? ''}\n${record.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  }

  heatmap(): HeatmapDay[] {
    const counts = new Map<string, number>();
    for (const record of this.records) {
      counts.set(record.date, (counts.get(record.date) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  }

  tags(): Array<[string, number]> {
    const counts = new Map<string, number>();
    for (const record of this.records) {
      for (const tag of record.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
}

function sortRecords(records: QuickMemoRecord[], direction: 'asc' | 'desc'): QuickMemoRecord[] {
  return [...records].sort((a, b) => {
    const result = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    return direction === 'asc' ? result : -result;
  });
}

function dateFromPath(path: string): string {
  const match = path.match(/([0-9]{4})[-\/]([0-9]{2})[-\/]([0-9]{2})\.md$/u);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '1970-01-01';
}
```

- [ ] **Step 4: Run index tests**

Run:

```bash
npm test -- tests/IndexService.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit index service**

Run:

```bash
git add src/index/IndexService.ts tests/IndexService.test.ts
git commit -m "feat: index quick memo records"
```

Expected: commit succeeds.

### Task 9: Implement Pure View State Helpers

**Files:**
- Create: `src/view/viewState.ts`
- Test: `tests/viewState.test.ts`

- [ ] **Step 1: Write failing view state tests**

Create `tests/viewState.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/viewState.test.ts
```

Expected: FAIL because `viewState.ts` does not exist.

- [ ] **Step 3: Implement view state helpers**

Create `src/view/viewState.ts`:

```ts
import type { DateRangePreset, QuickMemoRecord, QuickMemoType } from '../types';

export type TypeFilter = 'all' | QuickMemoType;
export type TodoStatusFilter = 'all' | 'completed' | 'open';

export interface ViewFilters {
  selectedDate?: string;
  type?: TypeFilter;
  tag?: string;
  text?: string;
  todoStatus?: TodoStatusFilter;
}

export function filterRecordsForView(records: QuickMemoRecord[], filters: ViewFilters): QuickMemoRecord[] {
  const text = filters.text?.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.selectedDate && record.date !== filters.selectedDate) return false;
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
```

- [ ] **Step 4: Run view state tests**

Run:

```bash
npm test -- tests/viewState.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit view state helpers**

Run:

```bash
git add src/view/viewState.ts tests/viewState.test.ts
git commit -m "feat: add quick memo view filters"
```

Expected: commit succeeds.

### Task 10: Implement Three-Column DOM Renderer

**Files:**
- Create: `src/view/render.ts`
- Test: `tests/render.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/render.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { HeatmapDay, QuickMemoRecord, QuickMemoSettings } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import { renderOverview } from '../src/view/render';

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
    };

    renderOverview(root, {
      settings: { ...DEFAULT_SETTINGS, userName: 'Ada', userSlogan: 'Think clearly' },
      records: [makeRecord('oqm-1', '2026-06-18', '09:00', 'flash', 'idea #a')],
      tags: [['#a', 1]],
      heatmap: [{ date: '2026-06-18', count: 1 }],
      selectedDate: '2026-06-18',
      editingRecordId: undefined,
      filters: {},
    }, callbacks);

    expect(root.querySelector('.oqm-layout')).toBeTruthy();
    expect(root.textContent).toContain('Ada');
    expect(root.textContent).toContain('Think clearly');
    expect(root.textContent).toContain('idea #a');
    expect(root.textContent).toContain('#a');
    expect(root.querySelector<HTMLTextAreaElement>('.oqm-input')?.placeholder).toContain('Markdown');
    expect(root.querySelectorAll('.oqm-heatmap-day')).toHaveLength(1);
  });
});

function makeRecord(id: string, date: string, time: string, type: QuickMemoRecord['type'], content: string): QuickMemoRecord {
  return { id, date, time, type, content, tags: content.match(/#[a-z]/g) ?? [], filePath: `${date}.md`, lineStart: 1, lineEnd: 1, hasStableId: true, raw: content, contentHash: id };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/render.test.ts
```

Expected: FAIL because renderer does not exist.

- [ ] **Step 3: Implement renderer**

Create `src/view/render.ts`:

```ts
import type { HeatmapDay, QuickMemoRecord, QuickMemoSettings, QuickMemoType } from '../types';
import type { ViewFilters } from './viewState';

export interface OverviewState {
  settings: QuickMemoSettings;
  records: QuickMemoRecord[];
  tags: Array<[string, number]>;
  heatmap: HeatmapDay[];
  selectedDate: string;
  filters: ViewFilters;
  editingRecordId?: string;
}

export interface OverviewCallbacks {
  onSave(draft: { type: QuickMemoType; content: string }): void;
  onSelectDate(date: string): void;
  onToggleTodo(record: QuickMemoRecord): void;
  onEdit(record: QuickMemoRecord): void;
  onSaveEdit(record: QuickMemoRecord, changes: { type: QuickMemoType; content: string; body?: string }): void;
  onCancelEdit(): void;
  onDelete(record: QuickMemoRecord): void;
  onCopyBlock(record: QuickMemoRecord): void;
  onOpenSource(record: QuickMemoRecord): void;
  onFilterChange(filters: Partial<ViewFilters>): void;
}

export function renderOverview(root: HTMLElement, state: OverviewState, callbacks: OverviewCallbacks): void {
  root.empty?.();
  if (!root.empty) root.innerHTML = '';
  root.classList.add('oqm-root');

  const layout = root.createDiv({ cls: 'oqm-layout' });
  renderSidebar(layout.createDiv({ cls: 'oqm-sidebar' }), state, callbacks);
  renderMain(layout.createDiv({ cls: 'oqm-main' }), state, callbacks);
  renderHeatmap(layout.createDiv({ cls: 'oqm-heatmap' }), state.heatmap, callbacks);
}

function renderSidebar(container: HTMLElement, state: OverviewState, callbacks: OverviewCallbacks): void {
  const profile = container.createDiv({ cls: 'oqm-profile' });
  if (state.settings.avatar) profile.createEl('img', { cls: 'oqm-avatar', attr: { src: state.settings.avatar, alt: state.settings.userName } });
  profile.createEl('h2', { text: state.settings.userName });
  profile.createEl('p', { text: state.settings.userSlogan });

  const typeSelect = container.createEl('select', { cls: 'oqm-type-filter' });
  for (const [value, label] of [['all', '全部'], ['record', '记录'], ['flash', '闪念'], ['todo', '待办']] as const) {
    typeSelect.createEl('option', { text: label, value });
  }
  typeSelect.onchange = () => callbacks.onFilterChange({ type: typeSelect.value as ViewFilters['type'] });

  const search = container.createEl('input', { cls: 'oqm-search', attr: { type: 'search', placeholder: '关键词搜索' } });
  search.value = state.filters.text ?? '';
  search.oninput = () => callbacks.onFilterChange({ text: search.value });

  const tags = container.createDiv({ cls: 'oqm-tags' });
  for (const [tag, count] of state.tags) {
    const button = tags.createEl('button', { text: `${tag} ${count}` });
    button.onclick = () => callbacks.onFilterChange({ tag });
  }
}

function renderMain(container: HTMLElement, state: OverviewState, callbacks: OverviewCallbacks): void {
  const composer = container.createDiv({ cls: 'oqm-composer' });
  const type = composer.createEl('select', { cls: 'oqm-type' });
  for (const [value, label] of [['record', '记录'], ['flash', '闪念'], ['todo', '待办']] as const) {
    type.createEl('option', { text: label, value });
  }
  type.value = state.settings.defaultRecordType;

  const input = composer.createEl('textarea', { cls: 'oqm-input', attr: { placeholder: '输入 Markdown，Cmd/Ctrl + Enter 保存' } });
  const save = composer.createEl('button', { text: '保存', cls: 'oqm-save' });
  const submit = () => {
    const content = input.value.trim();
    if (!content) return;
    callbacks.onSave({ type: type.value as QuickMemoType, content });
  };
  save.onclick = submit;
  input.onkeydown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit();
  };

  container.createEl('h3', { text: `${state.selectedDate} 时间线` });
  const list = container.createDiv({ cls: 'oqm-record-list' });
  if (state.records.length === 0) {
    list.createDiv({ cls: 'oqm-empty', text: '这一天还没有 Quick Memo。' });
    return;
  }

  for (const record of state.records) renderRecord(list, record, state.editingRecordId === record.id, callbacks);
}

function renderRecord(list: HTMLElement, record: QuickMemoRecord, editing: boolean, callbacks: OverviewCallbacks): void {
  const card = list.createDiv({ cls: `oqm-record oqm-record-${record.type}` });
  card.createDiv({ cls: 'oqm-record-meta', text: `${record.time} · ${typeLabel(record.type)}` });

  if (editing) {
    const editType = card.createEl('select', { cls: 'oqm-edit-type' });
    for (const [value, label] of [['record', '记录'], ['flash', '闪念'], ['todo', '待办']] as const) {
      editType.createEl('option', { text: label, value });
    }
    editType.value = record.type;

    const editor = card.createEl('textarea', { cls: 'oqm-edit-input' });
    editor.value = record.body ? `${record.content}\n${record.body}` : record.content;

    const editActions = card.createDiv({ cls: 'oqm-record-actions' });
    editActions.createEl('button', { text: '保存' }).onclick = () => {
      const [content, ...bodyLines] = editor.value.replace(/\r\n/gu, '\n').split('\n');
      callbacks.onSaveEdit(record, { type: editType.value as QuickMemoType, content: content.trim(), body: bodyLines.join('\n') || undefined });
    };
    editActions.createEl('button', { text: '取消' }).onclick = () => callbacks.onCancelEdit();
    return;
  }

  card.createDiv({ cls: 'oqm-record-content', text: record.body ? `${record.content}\n${record.body}` : record.content });

  const actions = card.createDiv({ cls: 'oqm-record-actions' });
  if (record.type === 'todo') {
    const toggle = actions.createEl('button', { text: record.completed ? '标记未完成' : '完成' });
    toggle.onclick = () => callbacks.onToggleTodo(record);
  }
  actions.createEl('button', { text: '编辑' }).onclick = () => callbacks.onEdit(record);
  actions.createEl('button', { text: '删除' }).onclick = () => callbacks.onDelete(record);
  actions.createEl('button', { text: '复制块链接' }).onclick = () => callbacks.onCopyBlock(record);
  actions.createEl('button', { text: '打开源文件' }).onclick = () => callbacks.onOpenSource(record);
}

function renderHeatmap(container: HTMLElement, heatmap: HeatmapDay[], callbacks: OverviewCallbacks): void {
  container.createEl('h3', { text: '热力图' });
  const grid = container.createDiv({ cls: 'oqm-heatmap-grid' });
  const max = Math.max(1, ...heatmap.map((day) => day.count));
  for (const day of heatmap) {
    const level = Math.ceil((day.count / max) * 4);
    const button = grid.createEl('button', { cls: `oqm-heatmap-day oqm-heatmap-level-${level}`, attr: { title: `${day.date}: ${day.count} 条` } });
    button.onclick = () => callbacks.onSelectDate(day.date);
  }
}

function typeLabel(type: QuickMemoType): string {
  return type === 'record' ? '记录' : type === 'flash' ? '闪念' : '待办';
}
```

- [ ] **Step 4: Run renderer tests**

Run:

```bash
npm test -- tests/render.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit renderer**

Run:

```bash
git add src/view/render.ts tests/render.test.ts
git commit -m "feat: render quick memo overview"
```

Expected: commit succeeds.

### Task 11: Implement Obsidian View Wrapper

**Files:**
- Create: `src/view/QuickMemoView.ts`

- [ ] **Step 1: Create QuickMemoView wrapper**

Write `src/view/QuickMemoView.ts`:

```ts
import { ItemView, Notice, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_QUICK_MEMO } from '../constants';
import type { QuickMemoRecord, QuickMemoSettings, QuickMemoType } from '../types';
import type { IndexService } from '../index/IndexService';
import type { MarkdownRecordRepository } from '../markdown/MarkdownRecordRepository';
import { randomIdSuffix } from '../markdown/id';
import { filterRecordsForView, type ViewFilters } from './viewState';
import { renderOverview } from './render';

export class QuickMemoView extends ItemView {
  private selectedDate = today();
  private filters: ViewFilters = {};
  private editingRecordId: string | undefined;

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

  async onOpen(): Promise<void> {
    await this.index.rebuild();
    this.render();
  }

  async refresh(): Promise<void> {
    await this.index.refreshChangedFiles();
    this.render();
  }

  private render(): void {
    const allRecords = this.index.query({});
    const records = filterRecordsForView(allRecords, { ...this.filters, selectedDate: this.selectedDate });
    renderOverview(this.contentEl, {
      settings: this.settings,
      records,
      tags: this.index.tags(),
      heatmap: this.index.heatmap(),
      selectedDate: this.selectedDate,
      editingRecordId: this.editingRecordId,
      filters: this.filters,
    }, {
      onSave: (draft) => void this.saveDraft(draft),
      onSelectDate: (date) => {
        this.selectedDate = date;
        this.render();
      },
      onToggleTodo: (record) => void this.toggleTodo(record),
      onEdit: (record) => {
        this.editingRecordId = record.id;
        this.render();
      },
      onSaveEdit: (record, changes) => void this.saveEdit(record, changes),
      onCancelEdit: () => {
        this.editingRecordId = undefined;
        this.render();
      },
      onDelete: (record) => void this.deleteRecord(record),
      onCopyBlock: (record) => this.copyBlock(record),
      onOpenSource: (record) => void this.openSource(record),
      onFilterChange: (filters) => {
        this.filters = { ...this.filters, ...filters };
        this.render();
      },
    });
  }

  private async saveDraft(draft: { type: QuickMemoType; content: string }): Promise<void> {
    const [content, ...bodyLines] = draft.content.replace(/\r\n/gu, '\n').split('\n');
    await this.repository.appendRecord({
      date: this.selectedDate,
      time: currentTime(),
      type: draft.type,
      content,
      body: bodyLines.join('\n') || undefined,
      completed: draft.type === 'todo' ? false : undefined,
    }, randomIdSuffix());
    await this.index.rebuild();
    this.render();
  }

  private async toggleTodo(record: QuickMemoRecord): Promise<void> {
    if (!record.id) {
      new Notice('该记录缺少块 ID，请先补全 ID 后再勾选。');
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
    const confirmed = window.confirm('删除这条 Quick Memo？此操作会修改 Daily Note 文件。');
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
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit view wrapper**

Run:

```bash
git add src/view/QuickMemoView.ts
git commit -m "feat: add quick memo Obsidian view"
```

Expected: commit succeeds.

### Task 12: Implement Settings Tab UI

**Files:**
- Create: `src/settings/SettingsTab.ts`

- [ ] **Step 1: Create settings tab**

Write `src/settings/SettingsTab.ts`:

```ts
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { QuickMemoSettings, QuickMemoType, SortDirection } from '../types';

interface QuickMemoSettingsHost extends Plugin {
  settings: QuickMemoSettings;
  saveSettings(): Promise<void>;
}

export class QuickMemoSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: QuickMemoSettingsHost) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Quick Memo 设置' });

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
      .setName('兜底日记文件夹')
      .setDesc('Daily Notes 配置不可用时使用。')
      .addText((text) => text
        .setValue(this.plugin.settings.fallbackDailyNotesFolder)
        .onChange(async (value) => {
          this.plugin.settings.fallbackDailyNotesFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('兜底日期格式')
      .setDesc('支持 YYYY、MM、DD，例如 YYYY-MM-DD 或 YYYY/MM/DD。')
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
  }
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit settings tab**

Run:

```bash
git add src/settings/SettingsTab.ts
git commit -m "feat: add quick memo settings tab"
```

Expected: commit succeeds.

### Task 13: Implement Plugin Bootstrap and Commands

**Files:**
- Create: `src/main.ts`

- [ ] **Step 1: Create plugin bootstrap**

Write `src/main.ts`:

```ts
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
```

- [ ] **Step 2: Run typecheck and tests**

Run:

```bash
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 3: Build plugin bundle**

Run:

```bash
npm run build
```

Expected: PASS and `main.js` is created.

- [ ] **Step 4: Commit plugin bootstrap**

Run:

```bash
git add src/main.ts
git commit -m "feat: bootstrap quick memo plugin"
```

Expected: commit succeeds.

### Task 14: Add Styling for Overview Page

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Add CSS**

Write `styles.css`:

```css
.oqm-root {
  height: 100%;
  color: var(--text-normal);
  background: var(--background-primary);
}

.oqm-root *,
.oqm-root *::before,
.oqm-root *::after {
  box-sizing: border-box;
}

.oqm-layout {
  display: grid;
  grid-template-columns: minmax(196px, 248px) minmax(380px, 1fr) minmax(196px, 264px);
  gap: var(--size-4-4);
  height: 100%;
  padding: var(--size-4-4);
}

.oqm-sidebar,
.oqm-main,
.oqm-heatmap {
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-l);
  padding: var(--size-4-4);
  background: var(--background-primary);
}

.oqm-main {
  background: var(--background-primary);
}

.oqm-profile {
  padding-bottom: var(--size-4-3);
  border-bottom: 1px solid var(--background-modifier-border);
  margin-bottom: var(--size-4-3);
}

.oqm-profile h2 {
  margin: var(--size-4-2) 0 var(--size-2-2);
  color: var(--text-normal);
  font-size: var(--font-ui-large);
  line-height: var(--line-height-tight);
}

.oqm-profile p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  line-height: var(--line-height-normal);
}

.oqm-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.oqm-type-filter,
.oqm-search,
.oqm-type,
.oqm-input,
.oqm-edit-type,
.oqm-edit-input {
  width: 100%;
  min-height: 36px;
  border-radius: var(--radius-s);
}

.oqm-search,
.oqm-input,
.oqm-edit-input {
  color: var(--text-normal);
  background: var(--background-primary);
}

.oqm-type-filter,
.oqm-search {
  margin-bottom: var(--size-2-3);
}

.oqm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2-2);
  margin-top: var(--size-4-3);
}

.oqm-tags button,
.oqm-record-actions button,
.oqm-save,
.oqm-heatmap-day {
  cursor: pointer;
}

.oqm-tags button,
.oqm-record-actions button,
.oqm-save {
  min-height: 32px;
  border-radius: var(--radius-s);
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.oqm-tags button:hover,
.oqm-record-actions button:hover,
.oqm-save:hover {
  border-color: var(--interactive-accent);
}

.oqm-tags button:focus-visible,
.oqm-record-actions button:focus-visible,
.oqm-save:focus-visible,
.oqm-heatmap-day:focus-visible,
.oqm-input:focus-visible,
.oqm-edit-input:focus-visible,
.oqm-search:focus-visible,
.oqm-type:focus-visible,
.oqm-type-filter:focus-visible,
.oqm-edit-type:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

.oqm-composer {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) auto;
  gap: var(--size-4-2);
  align-items: start;
  margin-bottom: var(--size-4-4);
  padding-bottom: var(--size-4-4);
  border-bottom: 1px solid var(--background-modifier-border);
}

.oqm-input,
.oqm-edit-input {
  min-height: 88px;
  resize: vertical;
  line-height: var(--line-height-normal);
}

.oqm-record-list {
  display: flex;
  flex-direction: column;
  gap: var(--size-4-2);
}

.oqm-record {
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  padding: var(--size-4-3);
  background: var(--background-secondary);
  transition: border-color 160ms ease, background-color 160ms ease;
}

.oqm-record:hover {
  border-color: var(--background-modifier-border-hover);
}

.oqm-record-meta {
  font-size: var(--font-ui-smaller);
  color: var(--text-muted);
  margin-bottom: var(--size-2-2);
}

.oqm-record-content {
  white-space: pre-wrap;
  line-height: var(--line-height-normal);
  color: var(--text-normal);
  max-width: 75ch;
}

.oqm-record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2-2);
  margin-top: var(--size-4-2);
}

.oqm-edit-type {
  margin-bottom: var(--size-2-2);
}

.oqm-heatmap-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(18px, 1fr));
  gap: var(--size-2-1);
  align-items: center;
}

.oqm-heatmap-day {
  min-width: 18px;
  min-height: 18px;
  aspect-ratio: 1;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-modifier-border);
  transition: background-color 160ms ease, border-color 160ms ease;
}

.oqm-heatmap-day:hover {
  border-color: var(--interactive-accent-hover);
}

.oqm-heatmap-level-1 { background: color-mix(in srgb, var(--interactive-accent) 24%, var(--background-primary)); }
.oqm-heatmap-level-2 { background: color-mix(in srgb, var(--interactive-accent) 42%, var(--background-primary)); }
.oqm-heatmap-level-3 { background: color-mix(in srgb, var(--interactive-accent) 62%, var(--background-primary)); }
.oqm-heatmap-level-4 { background: color-mix(in srgb, var(--interactive-accent) 82%, var(--background-primary)); }

.oqm-empty {
  color: var(--text-muted);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  padding: var(--size-4-8);
  text-align: center;
  background: var(--background-secondary);
}

@media (max-width: 900px) {
  .oqm-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100%;
  }

  .oqm-composer {
    grid-template-columns: 1fr;
  }

  .oqm-sidebar,
  .oqm-main,
  .oqm-heatmap {
    overflow: visible;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oqm-root *,
  .oqm-root *::before,
  .oqm-root *::after {
    transition: none !important;
  }
}
```

- [ ] **Step 2: Build and confirm CSS is packaged by Obsidian convention**

Run:

```bash
npm run build
```

Expected: PASS. Obsidian loads `styles.css` next to `manifest.json` and `main.js` when the plugin is installed.

- [ ] **Step 3: Commit styles**

Run:

```bash
git add styles.css
git commit -m "style: add quick memo overview layout"
```

Expected: commit succeeds.

### Task 15: Manual Obsidian Acceptance Test

**Files:**
- Modify: `docs/superpowers/plans/2026-06-18-obsidian-quick-memo.md` only if test results reveal plan corrections.

- [ ] **Step 1: Build production bundle**

Run:

```bash
npm run build
```

Expected: PASS and `main.js` exists.

- [ ] **Step 2: Install into a test vault**

Run this from the project root, replacing `/path/to/TestVault` with a real local Obsidian test vault path:

```bash
mkdir -p /path/to/TestVault/.obsidian/plugins/obsidian-quick-memo
cp manifest.json main.js styles.css /path/to/TestVault/.obsidian/plugins/obsidian-quick-memo/
```

Expected: plugin files are copied into the vault plugin folder.

- [ ] **Step 3: Enable plugin in Obsidian**

In Obsidian:

1. Open the test vault.
2. Go to Settings → Community plugins.
3. Disable Safe mode if needed.
4. Enable `Quick Memo`.

Expected: no console error appears and a Quick Memo ribbon icon is visible.

- [ ] **Step 4: Verify first-use settings**

In Obsidian:

1. Open Settings → Quick Memo.
2. Set user name to `Ada`.
3. Set slogan to `Capture ideas fast`.
4. Set fallback folder to `Daily Notes`.
5. Set fallback date format to `YYYY-MM-DD`.
6. Keep block IDs enabled.

Expected: settings persist after closing and reopening the settings pane.

- [ ] **Step 5: Verify overview, write, and markdown output**

In Obsidian:

1. Click the Quick Memo ribbon icon.
2. Select type `闪念`.
3. Enter:

```md
插件总览页布局可以做成三栏 #obsidian
中间是输入区和记录流。
右侧是热力图。
```

4. Press `Cmd/Ctrl + Enter` or click Save.

Expected in UI:

- The overview opens with left profile, center input/records, and right heatmap.
- The new flash record appears in today's timeline.
- The heatmap has a colored day for today.

Expected in today's Daily Note:

```md
## Quick Memo

- HH:mm [闪念] 插件总览页布局可以做成三栏 #obsidian ^oqm-YYYYMMDD-HHmmss-xxxx
  中间是输入区和记录流。
  右侧是热力图。
```

- [ ] **Step 6: Verify todo toggle**

In Obsidian:

1. In Quick Memo overview, select type `待办`.
2. Enter `写第一版设计文档 #todo`.
3. Save.
4. Click the todo completion button on the new record.

Expected in today's Daily Note: the todo line changes from `- [ ] HH:mm [待办] 写第一版设计文档 #todo ^oqm-...` to `- [x] HH:mm [待办] 写第一版设计文档 #todo ^oqm-...`.

- [ ] **Step 7: Verify filters and heatmap date selection**

In Obsidian:

1. Add one record with `#project`.
2. Click `#project` in the sidebar.
3. Search for `设计`.
4. Click today's heatmap cell.

Expected: filtered records only contain matching Quick Memo entries, and clicking the heatmap keeps or switches the selected date to today.

- [ ] **Step 8: Verify pure Markdown mode**

In Obsidian:

1. Disable `启用块 ID` in settings.
2. Add a `记录` with content `纯净模式记录 #plain`.

Expected in Daily Note: the new line is `- HH:mm [记录] 纯净模式记录 #plain` with no `^oqm-*` suffix. It still appears in overview and search results.

- [ ] **Step 9: Commit acceptance fixes or final state**

If manual testing required code fixes, run tests and commit those fixes. If no fixes were needed, commit generated build artifacts only if this project chooses to version `main.js`; otherwise do not commit `main.js`.

Recommended command if no build artifacts are committed:

```bash
git status --short
```

Expected: only intentionally untracked build files appear, or the working tree is clean.

## Tracked Deferred Notes

- **Block id placement on multi-line records:** All write paths (`QuickMemoParser.serializeRecord` for append/update, `MarkdownRecordRepository.backfillMissingIds`) place the `^oqm-...` id on the FIRST line of a multi-line list item, and `extractBlockId` reads it from the first line. This is internally consistent and matches Obsidian's common list-item block semantics. If strict last-line placement is later required for multi-line bodies, change `serializeRecord` and `backfillMissingIds` together and re-verify `extractBlockId`/`stripBlockId`. Not a v1 blocker.

## Plan Self-Review

Spec coverage:

- Markdown-only source of truth: Tasks 4, 7, 8.
- `## Quick Memo` section parsing and writing: Tasks 4, 6, 7.
- Optional block IDs and pure Markdown mode: Tasks 3, 7, 15.
- Daily Notes / Calendar fallback: Task 6 and Task 13 internal config wiring.
- Overview page with three columns: Tasks 10, 11, 14, 15.
- Records, flash thoughts, todos: Tasks 4, 7, 10, 11, 15.
- Editing: repository update exists in Task 7 and inline card editing is wired through Tasks 10 and 11.
- Delete confirmation: Task 11.
- Tags, type, keyword filters: Tasks 8, 9, 10, 15.
- Heatmap: Tasks 8, 10, 14, 15.
- Settings: Tasks 2, 12, 13, 15.
- Rebuild index: Tasks 8 and 13.
