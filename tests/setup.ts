// render.ts uses Obsidian's `activeDocument` global for popout-window
// compatibility. Under jsdom it doesn't exist, so alias it to the jsdom
// `document` before any test imports the renderer. (The global type itself
// comes from obsidian.d.ts, which is included in the test compile.)
(globalThis as { activeDocument?: Document }).activeDocument = document;

