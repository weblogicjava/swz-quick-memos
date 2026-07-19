// render.ts uses Obsidian's `activeDocument` global for popout-window
// compatibility. Under jsdom it doesn't exist, so alias it to the jsdom
// `document` before any test imports the renderer. (The global type itself
// comes from obsidian.d.ts, which is included in the test compile.)
(globalThis as { activeDocument?: Document }).activeDocument = document;

// render.ts builds DOM with Obsidian's global `createEl` helper (preferred over
// document/activeDocument.createElement — see the `obsidianmd/prefer-create-el`
// lint rule). Under jsdom that global doesn't exist, so install a faithful
// polyfill before any test imports the renderer. Covers the option shape used in
// practice (string cls, or a DomElementInfo-like object); callback omitted since
// the renderer calls `createEl(tag)` only.
(globalThis as { createEl?: unknown }).createEl = (
  tag: string,
  o?: Record<string, unknown> | string,
): HTMLElement => {
  const el = document.createElement(tag);
  if (typeof o === 'string') {
    el.className = o;
  } else if (o) {
    if (o.cls) el.className = Array.isArray(o.cls) ? (o.cls as string[]).join(' ') : String(o.cls);
    if (o.text != null) el.textContent = String(o.text);
    if (o.attr) {
      for (const [k, v] of Object.entries(o.attr as Record<string, unknown>)) {
        if (v != null) el.setAttribute(k, String(v));
      }
    }
    if (o.parent) (o.parent as Node).appendChild(el);
  }
  return el;
};

