export type FontSizeLevel = "small" | "medium" | "large";

type Listener = () => void;

let currentLevel: FontSizeLevel = "small";
const listeners = new Set<Listener>();

export function subscribeFontSizeStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFontSizeSnapshot(): FontSizeLevel {
  return currentLevel;
}

export function setFontSizeLevel(level: FontSizeLevel): void {
  if (currentLevel === level) return;
  currentLevel = level;
  listeners.forEach((listener) => listener());
}

export function syncFontSizeDom(level: FontSizeLevel): void {
  document.body.classList.remove("font-size-medium", "font-size-large");
  if (level === "medium") document.body.classList.add("font-size-medium");
  if (level === "large") document.body.classList.add("font-size-large");

  document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
    const active = btn.dataset.size === level;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
