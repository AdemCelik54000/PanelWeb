const DISMISS_COOLDOWN_DAYS = 7;

const DISMISS_AT_KEY = "clauddepo:ios-a2hs-dismissed-at";
const SEEN_THIS_SESSION_KEY = "clauddepo:ios-a2hs-seen-session";

function safeGetItem(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSetItem(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform as string | undefined;

  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);

  // iPadOS 13+ sometimes reports as Mac; touch points help differentiate.
  const isIPadOS13Plus = platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;

  return isAppleMobile || isIPadOS13Plus;
}

export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  // On iOS, other browsers embed identifiers such as CriOS / FxiOS / EdgiOS.
  const isSafariTokenPresent = /Safari\//.test(ua) || /Safari/.test(ua);
  const isOtherIOSBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA)/.test(ua);

  return isSafariTokenPresent && !isOtherIOSBrowser;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Standard display-mode check (supported by many browsers, including iOS newer versions).
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;

  // iOS Safari specific flag.
  if ((navigator as any).standalone === true) return true;

  return false;
}

export function shouldShowIosA2hsPrompt(nowMs: number = Date.now()): boolean {
  if (!isIOS()) return false;
  if (!isSafari()) return false;
  if (isStandalone()) return false;

  // Don’t show repeatedly in a single tab session.
  const seenThisSession = safeGetItem(window.sessionStorage, SEEN_THIS_SESSION_KEY);
  if (seenThisSession === "1") return false;

  // Optional cooldown after dismissal.
  const dismissedAtRaw = safeGetItem(window.localStorage, DISMISS_AT_KEY);
  if (dismissedAtRaw) {
    const dismissedAt = Number(dismissedAtRaw);
    if (!Number.isNaN(dismissedAt)) {
      const cooldownMs = DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (nowMs - dismissedAt < cooldownMs) return false;
    }
  }

  return true;
}

export function markIosA2hsPromptSeenThisSession(): void {
  safeSetItem(window.sessionStorage, SEEN_THIS_SESSION_KEY, "1");
}

export function markIosA2hsPromptDismissed(nowMs: number = Date.now()): void {
  markIosA2hsPromptSeenThisSession();
  safeSetItem(window.localStorage, DISMISS_AT_KEY, String(nowMs));
}
