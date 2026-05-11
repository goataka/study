export type ScreenName = "start" | "quiz" | "result";

interface SetCurrentScreenOptions {
  history?: "auto" | "push" | "replace" | "none";
}

let currentScreen: ScreenName = "start";
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function toScreenName(value: unknown): ScreenName {
  return value === "quiz" || value === "result" ? value : "start";
}

export function subscribeScreenStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getScreenSnapshot(): ScreenName {
  return currentScreen;
}

export function setCurrentScreen(screen: ScreenName, options: SetCurrentScreenOptions = {}): void {
  const historyMode = options.history ?? "auto";

  if (historyMode !== "none") {
    const mode = historyMode === "auto" ? (screen === "start" ? "replace" : "push") : historyMode;
    if (mode === "push") {
      window.history.pushState({ screen }, document.title);
    } else {
      window.history.replaceState({ screen }, document.title);
    }
  }

  if (currentScreen === screen) return;
  currentScreen = screen;
  notify();
}

export function getScreenNameFromHistoryState(state: unknown): ScreenName {
  if (typeof state !== "object" || state === null) return "start";
  return toScreenName((state as { screen?: unknown }).screen);
}

export function __resetScreenStoreForTests(): void {
  currentScreen = "start";
  listeners.clear();
}
