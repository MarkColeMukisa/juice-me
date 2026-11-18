import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, text, useColors } from "@/lib/theme";

/** How long an alert stays before it slides away by itself. */
const SHOWN_MS = 6000;

/**
 * An alert sliding down from the top, over whatever screen is open: "Your order JM-0016 is
 * now Ready". Tapped, it opens what it is about; the cross, or six seconds, put it away.
 */
export function AlertBanner({ title, body, onOpen, onClose }: { title: string; body: string | null; onOpen: () => void; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const y = useSharedValue(still ? 0 : -160);
  const shown = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      shown.value = 1;
    } else {
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      shown.value = withTiming(1, { duration: 180 });
    }
    // Away by itself after a while, the way it came.
    const away = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(onClose)();
    };
    if (still) shown.value = withDelay(SHOWN_MS, withTiming(0, { duration: 1 }, away));
    else y.value = withDelay(SHOWN_MS, withTiming(-160, { duration: 260 }, away));
    // Once, when it appears: a new alert is a new banner (its key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: shown.value }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }, style]}>
      <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityHint="Opens it" onPress={onOpen} style={styles.main}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="notifications" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={2} style={{ color: colors.text, fontSize: text.body, fontWeight: "700" }}>{title}</Text>
            {body ? <Text numberOfLines={2} style={{ color: colors.muted, fontSize: text.small }}>{body}</Text> : null}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={onClose} style={styles.close}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 1000, elevation: 1000 },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, paddingVertical: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.sm, gap: spacing.sm, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  close: { padding: spacing.xs },
});
