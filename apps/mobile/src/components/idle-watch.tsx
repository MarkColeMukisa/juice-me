import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { countdownMs, IDLE_MS, idleEnabled, lastActive, markActive, noteIdleSignOut, saveActive } from "@/lib/idle-clock";
import { radius, spacing, text, useColors } from "@/lib/theme";

/** How often the time since the last touch is looked at: the question comes at most this late. */
const CHECK_EVERY_MS = 5 * 1000;

/**
 * Signs an unattended phone out, as the dashboard's SessionWatchdog does: after a while with
 * no touch, "Still there?" counts down and signs out. Coming back to the app after longer
 * than that signs out straight away. Wraps the screens so any touch anywhere counts.
 */
export function IdleWatch({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const colors = useColors();
  const watching = idleEnabled && user !== null;
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const leaving = useRef(false);

  // Held in refs, so the timers below are set once per sign-in, not again on every change.
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const asking = useRef(false);
  asking.current = deadline !== null;

  /** Timed out: signed out, keeping this phone's alerts. The root layout opens the sign-in screen, which says why. */
  const out = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    setDeadline(null);
    noteIdleSignOut();
    try {
      await signOutRef.current({ keepPush: true });
    } finally {
      leaving.current = false;
    }
  }, []);

  /** "Sign out" pressed: the person signing themselves out, so the alerts stop as they always do. */
  const leave = () => {
    setDeadline(null);
    void signOutRef.current();
  };

  // Away long enough, or long enough without a touch: ask, or, past the countdown too, sign out.
  const look = useCallback(() => {
    if (asking.current || leaving.current) return;
    const idle = Date.now() - lastActive();
    if (idle < IDLE_MS) return;
    if (idle >= IDLE_MS + countdownMs) {
      void out();
      return;
    }
    setNow(Date.now());
    setDeadline(Date.now() + countdownMs);
  }, [out]);

  useEffect(() => {
    if (!watching) return;
    // Signed in just now: the clock starts here.
    markActive();
    const check = setInterval(look, CHECK_EVERY_MS);
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") look();
      else void saveActive();
    });
    return () => {
      clearInterval(check);
      state.remove();
    };
  }, [watching, look]);

  // The countdown, from a deadline, so a phone that slept through it still signs out on time.
  useEffect(() => {
    if (deadline === null) return;
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline) {
        clearInterval(tick);
        void out();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [deadline, out]);

  const stay = () => {
    markActive();
    void saveActive();
    setDeadline(null);
  };

  const remaining = deadline === null ? countdownMs : Math.max(0, deadline - now);

  return (
    // A touch while the question is up doesn't count: only "Stay signed in" does.
    <View style={styles.fill} onTouchStart={deadline === null && watching ? () => markActive() : undefined}>
      {children}
      <Modal visible={deadline !== null && watching} transparent animationType="fade" statusBarTranslucent onRequestClose={stay}>
        <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
          <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: text.heading, fontWeight: "700" }}>Still there?</Text>
            <Text style={{ color: colors.muted, fontSize: text.body, lineHeight: 22 }}>
              For your security you'll be signed out in <Text style={{ color: colors.text, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Math.ceil(remaining / 1000)} s</Text>, after a while with no activity.
            </Text>
            <View style={[styles.track, { backgroundColor: colors.fill }]}>
              <View style={[styles.bar, { backgroundColor: colors.brand, width: `${(remaining / countdownMs) * 100}%` }]} />
            </View>
            <Button label="Stay signed in" onPress={stay} />
            <Button variant="secondary" label="Sign out" onPress={leave} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 420, gap: spacing.md, padding: spacing.xl, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  track: { height: 6, borderRadius: radius.full, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.full },
});
