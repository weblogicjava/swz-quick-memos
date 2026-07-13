# Active Filter Chips — Design

**Date:** 2026-07-13
**Status:** Approved
**Scope:** Right-pane results area shows the active query conditions as removable capsules, inline with the "筛选结果" heading.

## Goal

When the user filters content — by clicking a left stat card, choosing a query type, typing a keyword, or clicking a tag — the right pane already switches to a cross-date "筛选结果" view. This change adds a capsule (chip) for **each active filter condition** on the same row as the "筛选结果" heading. Each chip is clickable to remove just that condition, and a "清除全部" button clears every condition at once. Removing a condition also updates the left sidebar, because the sidebar is derived from filter state on every re-render.

## Active-filter model

A new **pure** helper in `src/view/viewState.ts` (unit-testable, no DOM):

```ts
export interface ActiveFilterChip {
  key: 'type' | 'tag' | 'text';
  label: string;                     // shown in the chip (may be CSS-truncated)
  fullLabel: string;                 // untruncated, for title / aria-label
  clear: Partial<ViewFilters>;       // patch that removes just this condition
}
export function activeFilterChips(filters: ViewFilters): ActiveFilterChip[]
```

- **Order:** type → tag → keyword.
- **Type chip** — present only when `type` is set and `!== 'all'`. Label mirrors the composite select: `记录` / `闪念` / `待办`, or `已完成待办` / `未完成待办` when `type === 'todo'` and `todoStatus` is set. `clear = { type: undefined, todoStatus: undefined }`.
- **Tag chip** — present only when `tag` is truthy. Label `#<tag>`. `clear = { tag: undefined }`.
- **Keyword chip** — present only when `text?.trim()` is non-empty. Label `关键词：<text>` (CSS ellipsis truncates the visible text; `fullLabel` carries the whole string). `clear = { text: undefined }`.
- `selectedDate` is never a chip (it is the always-present base date, not a removable query condition).

## View changes (`src/view/render.ts`)

`renderCrossDateTimeline` renders a **filter bar first**, then either the empty-state message *or* the date groups — so chips remain removable when a filter matches nothing.

```
[筛选结果]  [#tag ✕] [闪念 ✕] [关键词：abc ✕]   [清除全部]
─────────────────────────────────────────────
<date groups / empty message>
```

- The `筛选结果` text stays in an `<h3>` (the existing `.oqm-main h3` text assertion must still pass); its margin is reset inside the flex bar.
- Each chip is a `<button class="oqm-filter-chip">`; the whole button is clickable and calls `callbacks.onFilterChange(chip.clear)`. The `✕` is a visual `<span>`, not a separate target.
- "清除全部" is a `<button class="oqm-filter-clear">` shown **only when there are ≥ 2 chips** (with a single chip it duplicates the chip's own removal). It calls `onFilterChange({ type: undefined, tag: undefined, text: undefined, todoStatus: undefined })`.

## Wiring fix (`src/view/QuickMemoView.ts`)

`onFilterChange` currently short-circuits any patch containing `text` when the text value is unchanged:

```ts
if ('text' in filters && (next.text ?? '') === (this.filters.text ?? '')) return;
```

That blocks "清除全部" when there is no keyword filter (the patch includes `text: undefined`, equal to the current `undefined`, so the whole update is skipped and type/tag are never cleared). Scope the skip to **text-only patches** so every chip and clear-all removal applies:

```ts
const keys = Object.keys(filters);
const isTextOnly = keys.length === 1 && keys[0] === 'text';
if (isTextOnly && (next.text ?? '') === (this.filters.text ?? '')) return;
```

The search-box blur/Enter path still passes a `{ text }`-only patch, so its dedup behavior is unchanged.

## Styling (`styles.css`, Obsidian theme variables only, scoped under `.oqm-root`)

- `.oqm-filter-bar` — flex, `align-items: center`, `gap`, `flex-wrap` (graceful fallback when many chips), bottom margin equal to the old h3.
- `.oqm-filter-bar-title` (the h3) — `margin: 0`, `flex: 0 0 auto`.
- `.oqm-filter-chip` — filled accent pill mirroring `.oqm-tags button.oqm-tag-selected` (`--interactive-accent` fill, `--text-on-accent`), label span with `max-width` + `text-overflow: ellipsis` + `white-space: nowrap`; muted `✕` that brightens on hover.
- `.oqm-filter-clear` — ghost text button (like `.oqm-heatmap-today`), muted → accent on hover.
- Add `.oqm-filter-chip` and `.oqm-filter-clear` to the shared `:focus-visible` outline list. The global `prefers-reduced-motion` rule already disables transitions.

## Edge cases

- **Zero matches, filters active** — chips still render (so the user can escape the empty state).
- **Removing the last chip** — no cross-date filter remains → the view returns to the normal single-day timeline for the current `selectedDate`.
- **Pure-markdown / id-less records** — unaffected; chips are filter-state UI, not record mutation.
- **"清除全部" hidden at 1 chip** — no redundant button.

## Testing

- `tests/viewState.test.ts` — unit-test `activeFilterChips`: correct chips + `clear` patches for type / tag / keyword (and their composites), correct ordering, and omission of `'all'` / empty / `selectedDate`.
- `tests/render.test.ts` — DOM tests: chips render with the right labels and `✕`; clicking a chip fires `onFilterChange(chip.clear)`; "清除全部" appears only at ≥ 2 chips and fires the full-clear patch; chips render even in the empty-match case.
- `npm run typecheck` is the gate; `npm test` must pass.
