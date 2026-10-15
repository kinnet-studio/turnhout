// The designer's text lives in the browser between visits. Storage can be missing or blocked (private windows,
// cleared site data), and the page must work without it, so every access is guarded.
export const STORAGE_KEY = 'turnhout.designer.rules';

export function loadRules(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveRules(text: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // Nothing to do: the text stays on the page, it just is not kept.
  }
}
