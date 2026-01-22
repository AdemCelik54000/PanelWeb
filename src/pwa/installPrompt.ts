const DISMISS_COOLDOWN_DAYS = 7;

const DISMISS_AT_KEY = "clauddepo:install-prompt-dismissed-at";

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

export type InstallPromptVariant =
  | "ios-safari"
  | "android-chrome"
  | "desktop-chrome"
  | "other";

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform as string | undefined;

  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS13Plus = platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;

  return isAppleMobile || isIPadOS13Plus;
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent || "");
}

export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const isSafariTokenPresent = /Safari\//.test(ua) || /Safari/.test(ua);
  const isOtherIOSBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA)/.test(ua);

  return isSafariTokenPresent && !isOtherIOSBrowser;
}

export function isChromiumLike(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  // Chrome/Edge on Android + Desktop.
  return /(Chrome|Chromium|Edg|EdgA|OPR)/.test(ua);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  if ((navigator as any).standalone === true) return true;

  return false;
}

export function getInstallPromptVariant(): InstallPromptVariant {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";

  if (isIOS() && isSafari()) return "ios-safari";

  if (isAndroid() && /(Chrome|Chromium|EdgA|SamsungBrowser)/.test(ua)) {
    return "android-chrome";
  }

  const isMobile = /Mobile/.test(ua);
  if (!isMobile && isChromiumLike()) return "desktop-chrome";

  return "other";
}

export function shouldShowInstallPrompt(nowMs: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;

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

export function markInstallPromptDismissed(nowMs: number = Date.now()): void {
  safeSetItem(window.localStorage, DISMISS_AT_KEY, String(nowMs));
}
