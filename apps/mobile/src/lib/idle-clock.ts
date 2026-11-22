import * as storage from "./storage";

/**
 * When the person signed in last used the app, so an unattended phone signs itself out as
 * the web dashboard does: a "Still there?" after IDLE_MS with no touch, out COUNTDOWN_MS
 * later. Time away from the app counts too: reopened after that long, it is signed out.
 *
 * The phone keeps receiving its pushes while signed out this way (the alert for a new order
 * still arrives); only signing out yourself stops them. EXPO_PUBLIC_SESSION_IDLE_MS=0 turns
 * this off.
 */
export const IDLE_MS = Number(process.env.EXPO_PUBLIC_SESSION_IDLE_MS ?? 14 * 60 * 1000 + 30 * 1000);
export const COUNTDOWN_MS = Number(process.env.EXPO_PUBLIC_SESSION_COUNTDOWN_MS ?? 30 * 1000);
export const idleEnabled = Number.isFinite(IDLE_MS) && IDLE_MS > 0;
export const countdownMs = Number.isFinite(COUNTDOWN_MS) && COUNTDOWN_MS > 0 ? COUNTDOWN_MS : 30 * 1000;

const KEY = "nevela.lastActive";
/** Writing to the keychain on every touch would be wasteful: once a minute is enough, as the check allows the countdown's slack. */
const SAVE_EVERY_MS = 60 * 1000;

let last = Date.now();
let saved = 0;

/** Someone touched the app. Cheap: a number, and now and then the keychain. */
export function markActive(at = Date.now()): void {
  last = at;
  if (at - saved > SAVE_EVERY_MS) void saveActive();
}

export function lastActive(): number {
  return last;
}

/** Kept on going to the background, so the time away is measured from here after a restart too. */
export async function saveActive(): Promise<void> {
  saved = Date.now();
  try {
    await storage.setItem(KEY, String(last));
  } catch {
    // The keychain refused: the in-memory clock still works while the app runs.
  }
}

export async function clearActive(): Promise<void> {
  try {
    await storage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
}

/** On opening the app: was the sign-in left unused past the limit and the countdown? */
export async function idleExpired(): Promise<boolean> {
  if (!idleEnabled) return false;
  try {
    const kept = Number(await storage.getItem(KEY));
    if (!Number.isFinite(kept) || kept <= 0) return false;
    last = kept;
    return Date.now() - kept >= IDLE_MS + countdownMs;
  } catch {
    return false;
  }
}

/** Why the last sign-out happened, for the sign-in screen to say once. */
let reason: "inactive" | null = null;
export function noteIdleSignOut(): void {
  reason = "inactive";
}
/** Whether there is a reason waiting, without using it up (the sign-in screen takes it). */
export function peekSignOutReason(): "inactive" | null {
  return reason;
}
export function takeSignOutReason(): "inactive" | null {
  const was = reason;
  reason = null;
  return was;
}
