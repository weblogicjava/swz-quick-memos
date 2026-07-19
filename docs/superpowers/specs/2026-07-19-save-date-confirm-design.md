# Save-to-Date Confirmation Dialog — Design

## Problem

When the user is browsing a non-today date (`selectedDate !== today`) and captures a new
record in the composer, it silently saves to the browsed (historical/future) date file.
The composer does show the target date, but a user who navigated away from today and forgot
can misfile a record without any signal.

## Goal

When saving a **new** record while `selectedDate !== today`, show a modal that lets the user
choose where the record goes: the currently selected date, today, or cancel.

## Scope

- **In scope:** new-record capture via the composer (`QuickMemoView.saveDraft`).
- **Out of scope (YAGNI):** editing an existing record (`saveEdit`) — edits stay in the
  record's own file. No "don't ask again" setting. No keyboard-shortcut changes beyond the
  existing 保存 button and Cmd/Ctrl+Enter.

## Trigger

`saveDraft`, before appending: if `this.selectedDate === today()`, append to today with no
dialog (current behavior, unchanged). Otherwise show the dialog.

## Dialog

New helper `chooseSaveDateDialog(app, selectedDate, today): Promise<'today' | 'selected' | undefined>`
in `QuickMemoView.ts`, mirroring the existing `confirmDialog` (Obsidian `Modal`-based, not
`window.confirm`).

- Title: `提醒`
- Body: `当前选择的是 {selectedDate}，不是今天（{today}）。这条记录要保存到哪一天？`
- Three buttons laid out in **one row** (a single `Setting` with three `.addButton()`):
  - **保存到 {selectedDate}** — primary CTA (`.setCta()`) → resolves `'selected'`
  - **保存到今天** — secondary → resolves `'today'`
  - **取消** → resolves `undefined`
- Closing the modal any other way (Esc, backdrop) resolves `undefined`.

Primary CTA is the selected date (the user is already there and composing intentionally);
the dialog is a guardrail, not a redirect-by-default.

## saveDraft resolution

- `'selected'` → append to `selectedDate` (stay on the current date).
- `'today'` → set `this.selectedDate = today()` (jump the view to today so the new record is
  immediately visible), then append to today.
- `undefined` (cancel) → **return without saving or re-rendering**; the composer keeps its
  text and focus so the user can edit/retry.
- Then (on a real save) rebuild index + `render()`.

`saveDraft` returns `Promise<boolean>`: `true` when a save happened, `false` on cancel.

## Input-clearing fix (required by the async dialog)

Today `render.submit()` clears `input.value` synchronously right after fire-and-forget
`onSave`. With an async dialog that would wipe the text before the user chooses. Change:

- `OverviewCallbacks.onSave`: `(draft) => Promise<boolean>` (resolved `true` if saved).
- `render.submit()` becomes `async`, `await`s `onSave`, and clears `input.value` **only when
  it resolves `true`**. On cancel (`false`) the text and focus are preserved; on save the
  re-render rebuilds the input empty anyway, and the explicit clear also runs.

## Testing (TDD)

Pure render-bridge tests in `render.test.ts` (the dialog itself is Obsidian-coupled and
untested, consistent with the repo's pattern of keeping `QuickMemoView` as assembly):

- "submit clears the composer input only when onSave resolves true" — `mockResolvedValue(true)`
  clears; `mockResolvedValue(false)` (cancel) retains the text.
- "submit calls onSave with the selected type and trimmed content" — whitespace-only content
  is skipped (no onSave call).

`makeCallbacks()` keeps `onSave: vi.fn()`; the new tests override it with a resolved boolean.

## Files

- `src/view/QuickMemoView.ts` — `chooseSaveDateDialog`; gate + date resolution in `saveDraft`;
  `onSave` wiring returns the promise (drop the `void`).
- `src/view/render.ts` — `onSave` signature `Promise<boolean>`; `submit()` async + conditional
  clear; `OverviewCallbacks` type updated.
- `tests/render.test.ts` — two new tests above.
