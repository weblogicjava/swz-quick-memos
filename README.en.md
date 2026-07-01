# Quick Memo — Obsidian Quick Capture Plugin

![Quick Memo preview](imgs/Snipaste_2026-06-21_15-01-27.png)

Quick Memo is a Markdown-native Obsidian plugin for fast daily capture of **records**, **flash thoughts** (闪念), and **todos**. It is database-free — the Daily Note Markdown file is the single source of truth. The plugin reads and writes one `## Quick Memo` section per day and keeps a rebuildable in-memory index for search, filters, and a 90-day activity heatmap. Records are stored in dedicated `yyyy-MM-dd-quick-memos.md` files, so your regular `yyyy-MM-dd.md` daily notes are never touched.

[中文文档 (Chinese README)](./README.md)

---

## What it is

Quick Memo lets you, inside Obsidian:

- Open an overview panel with one click and quickly capture records / flash thoughts / todos;
- Write every entry as plain Markdown list items into a dedicated `yyyy-MM-dd-quick-memos.md` file — your existing `yyyy-MM-dd.md` daily notes are never modified;
- Auto-maintain an in-memory index for filtering by type, by tag, and keyword search;
- Show a ~3-month activity heatmap (green intensity scales with the daily record count);
- Toggle todos complete/incomplete and sync the `- [ ]` / `- [x]` marker back to the file;
- Edit, delete, copy a block link, or open the source file for any record.

The index is fully rebuildable: it is a cache, and can be reconstructed from Markdown at any time.

---

## Installation

### Option A: Manual install (the release zip contains everything needed)

The release zip includes an `swz-quick-memos` folder with the three files Obsidian needs to load the plugin:

```
swz-quick-memos/
├── manifest.json
├── main.js
└── styles.css
```

Steps:

1. Unzip the release archive to get the `swz-quick-memos` folder;
2. Copy that whole folder into your vault's plugins directory:
   ```
   <your-vault>/.obsidian/plugins/swz-quick-memos/
   ```
   Create the `.obsidian/plugins` directory manually if it does not exist;
3. Open Obsidian → Settings → Community plugins;
4. Turn off "Safe mode" if you haven't already;
5. Find **Quick Memo** in the installed plugins list and enable it;
6. After enabling, a notebook icon (notebook-pen) appears in the left ribbon — click it to open the Quick Memo overview panel.

> Note: `main.js`, `styles.css`, and `manifest.json` must live together in a folder named `swz-quick-memos`, matching the `id` in `manifest.json`, or Obsidian will not recognize the plugin.

### Option B: Build from source (developers)

```bash
npm install
npm run build          # produces main.js
```

Then copy `manifest.json`, `main.js`, and `styles.css` into your vault's plugin folder.

---

## Usage

### 1. Open the panel

- Click the Quick Memo icon in the left ribbon;
- Or run the command `Open overview` (via `Ctrl/Cmd + P`).

### 2. Create a record

1. In the center composer, pick a type: record / flash thought / todo;
2. Type Markdown content (the composer is a source editor, it does not render live);
3. Click **Save**, or press `Cmd/Ctrl + Enter`.

The entry is written to that day's Quick Memo file and appears immediately in the timeline below.

### 3. Record Markdown format

All records live under a `## Quick Memo` heading in the day's file, for example:

```markdown
## Quick Memo

- 09:12 [闪念] a sudden idea #inspiration ^oqm-20260621-091200-a1b2
  an indented continuation line belongs to the same record
- [ ] 10:20 [待办] finish something #todo ^oqm-20260621-102000-c3d4
- [x] 11:00 [待办] something done #todo ^oqm-20260621-110000-e5f6
```

Type labels are the Chinese tokens `记录` (record) / `闪念` (flash) / `待办` (todo). Todos use `- [ ]` / `- [x]` to mark completion. `^oqm-…` is an optional block id used for stable editing, toggling, and block links.

### 4. Card actions

Each record has a `⋮` button at the top-right that opens an action menu:

- Mark complete / incomplete (todos only)
- Edit
- Copy block link
- Open source file
- Delete

The checkbox on a todo card can also be clicked directly to toggle completion (it syncs back to the file). Clicking outside the menu closes it automatically.

### 5. Filters and search

The left sidebar provides:

- **Type filter**: all / records / flash thoughts / todos / completed todos / open todos;
- **Keyword search**: triggered on **Enter** or **blur** (not on every keystroke, to avoid interrupting IME/Chinese input);
- **Tag filter**: click a tag to filter by it; click the selected tag again to clear;
- **Right-click a tag**: opens a menu to remove that tag from all records.
- **Clickable stat cards**: the 闪念/记录/待办 cards under the heatmap are clickable shortcuts that filter the timeline to that type across **all dates**; click the active card again to clear.

Tag, keyword, and type filters are vault-wide: results span every date and are grouped by date.

### 6. Heatmap

The middle of the sidebar shows a ~3-month (a fixed 90-square) activity heatmap:

- Each square is one day;
- Days with records are green; the more records, the deeper the green;
- Hover a square to see its date and count;
- Click a day's square to jump to that date's timeline;
- When browsing a historical date, a **today** link appears beside the heatmap heading to jump back to today.

The heatmap is independent of the selected date and is always anchored at "today".

### 7. Cross-midnight auto-refresh

The panel checks the local date once a minute; if you were viewing "today", it rolls over to the new day at midnight without interrupting you when browsing a historical date.

---

## Settings

Settings → Quick Memo:

| Setting | Description |
| --- | --- |
| User name | Shown under the avatar in the sidebar |
| Slogan | Shown under the user name |
| Avatar path or URL | An in-vault image path or an external URL |
| Quick Memo heading | The plugin only reads/writes records under this heading (default `Quick Memo`) |
| Use custom daily-note path | When on, ignores Obsidian's built-in Daily Notes config and uses the folder/format below (recommended for stable file location) |
| Daily-note folder | The folder records are written to, e.g. `每日工作` |
| Date format | Supports YYYY/MM/DD, e.g. `YYYY/MM/YYYY-MM-DD` produces `2026/06/2026-06-21-quick-memos.md` |
| Enable block IDs | On by default for stable editing, toggling, and block links; off enters "pure Markdown mode" (edit/toggle/delete on id-less records are blocked with a notice) |
| Default record type | The type selected by default when creating a new record |
| Record order | Newest first / oldest first |

Changing folder/format/heading rebuilds the index and refreshes the panel immediately.

---

## Highlights

- **Markdown-native, no database**: the files are the data; the index is a rebuildable cache, so backups and version control follow the Markdown.
- **Dedicated files, non-intrusive**: only writes `yyyy-MM-dd-quick-memos.md`; never touches your regular `yyyy-MM-dd.md` daily notes.
- **Configurable paths**: folder and date format are customizable, including nested `YYYY/MM/YYYY-MM-DD` structures.
- **Lightweight startup**: indexes only `-quick-memos.md` files, with filtered and debounced vault events to avoid slowdowns in large vaults.
- **Local dates**: all dates use local time, avoiding UTC off-by-one near midnight.
- **Theme-aware**: styles use only Obsidian theme variables, following light/dark themes.
- **Tested**: core logic (parser, path helpers, index, repository, renderer) is covered by unit tests without depending on the Obsidian runtime.

---

## Commands

| Command | Action |
| --- | --- |
| Open overview | Open the overview panel |
| Rebuild index | Manually rebuild the index |
| Backfill missing block IDs for today | Add missing block IDs to today's records |

---

## Data storage

Records are written (depending on your settings) to:

```
<vault>/<folder>/YYYY/MM/YYYY-MM-DD-quick-memos.md
```

Example:

```
<vault>/每日工作/2026/06/2026-06-21-quick-memos.md
```

The plugin's own settings are stored at:

```
<vault>/.obsidian/plugins/swz-quick-memos/data.json
```

Uninstalling the plugin leaves your Markdown records in place — they are not lost.

---

## Technical info

- Minimum Obsidian version: 1.7.2
- Works on desktop and mobile
- Author: songwz
- License: MIT
- Version: see `manifest.json`

---

## FAQ

**Q: Why don't my records show up?**
A: The plugin only indexes files named `yyyy-MM-dd-quick-memos.md`. Make sure records were written to such a file, not to a plain `yyyy-MM-dd.md` daily note. You can force a rebuild via the command palette: `Rebuild index`.

**Q: Can it read plain `yyyy-MM-dd.md` daily notes?**
A: This version intentionally only handles `-quick-memos.md` files, to avoid reading or writing your existing daily notes.

**Q: Does toggling a todo sync to the file?**
A: Yes. Toggling rewrites the corresponding `- [ ]` to `- [x]` in the file (the record needs a block id).

**Q: Will uninstalling lose data?**
A: No. All records are plain Markdown and remain in the files.
