import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type RefreshControlProps, type TextInputProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { radius, spacing, text, useColors } from "@/lib/theme";

/** The small set of pieces every screen is built from. */

/** How tall the tab bar's buttons are (the phone's own gesture area comes on top). */
export const TAB_BAR_HEIGHT = 60;

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** A screen's frame: safe areas, scrolling, and room for the keyboard. */
export function Screen({ children, edges = ["top"], refreshControl, centered = false, inTabs = false, scrollRef }: { children: ReactNode; edges?: Edge[]; refreshControl?: React.ReactElement<RefreshControlProps>; centered?: boolean; inTabs?: boolean; scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>> }) {
  const colors = useColors();
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          // The tab bar sits below the screen, not over it: a little room at the end is enough.
          contentContainerStyle={[styles.content, centered && styles.centered, inTabs && { paddingBottom: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children, center = false }: { children: ReactNode; center?: boolean }) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, center && { textAlign: "center" }]}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={[styles.heading, { color: colors.muted }]}>{children}</Text>;
}

export function Body({ children, muted = false, small = false, center = false }: { children: ReactNode; muted?: boolean; small?: boolean; center?: boolean }) {
  const colors = useColors();
  return <Text style={{ color: muted ? colors.muted : colors.text, fontSize: small ? text.small : text.body, lineHeight: small ? 18 : 22, textAlign: center ? "center" : undefined }}>{children}</Text>;
}

/** A message about what just happened: a refusal in red, good news in green. */
export function Notice({ children, tone = "danger" }: { children: ReactNode; tone?: "danger" | "success" }) {
  const colors = useColors();
  const colour = tone === "danger" ? colors.danger : colors.success;
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: tone === "danger" ? colors.dangerSoft : colors.successSoft }]}>
      <Ionicons name={tone === "danger" ? "alert-circle" : "checkmark-circle"} size={20} color={colour} />
      <Text style={{ flex: 1, color: colour, fontSize: text.small, lineHeight: 18, fontWeight: "500" }}>{children}</Text>
    </View>
  );
}

export function Button({ label, onPress, variant = "primary", busy = false, disabled = false, icon }: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger" | "link"; busy?: boolean; disabled?: boolean; icon?: IconName }) {
  const colors = useColors();
  const off = busy || disabled;
  const foreground = variant === "primary" ? colors.onBrand : variant === "danger" ? colors.danger : variant === "link" ? colors.brand : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        variant === "link" ? styles.link : styles.button,
        variant === "primary" && { backgroundColor: colors.brand },
        variant === "secondary" && { backgroundColor: colors.fill },
        variant === "danger" && { backgroundColor: colors.dangerSoft },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.85 },
        off && !busy && { opacity: 0.45 },
      ]}>
      {busy ? <ActivityIndicator color={foreground} /> : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
          <Text style={{ color: foreground, fontSize: variant === "link" ? text.label : text.lead, fontWeight: "600" }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** A labelled text box, with the server's complaint about it underneath when there is one. */
export function Field({ label, error, style, secureTextEntry, ...input }: { label: string; error?: string } & TextInputProps) {
  const colors = useColors();
  // A password box can be uncovered, so a person can check what they typed on a small keyboard.
  const [uncovered, setUncovered] = useState(false);
  // Grey at rest; white with an orange edge while typing in it.
  const [focused, setFocused] = useState(false);
  const hidden = Boolean(secureTextEntry) && !uncovered;
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.muted, fontSize: text.small, fontWeight: "500" }}>{label}</Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.faint}
          {...input}
          onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
          secureTextEntry={hidden}
          style={[styles.input, { color: colors.text, borderColor: error ? colors.danger : focused ? colors.brand : "transparent", backgroundColor: focused ? colors.background : colors.fill }, secureTextEntry && { paddingRight: 48 }, style]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uncovered ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setUncovered((now) => !now)}
            style={styles.eye}>
            <Ionicons name={uncovered ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: text.small }}>{error}</Text> : null}
    </View>
  );
}

/** A bordered group of rows, as in a settings screen. */
export function Card({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>{children}</View>;
}

/** One line of a card: what it is, its value or detail, and a chevron when it leads somewhere. */
export function Row({ icon, label, detail, value, onPress, danger = false, last = false }: { icon?: IconName; label: string; detail?: string | null; value?: string | null; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const colors = useColors();
  const colour = danger ? colors.danger : colors.text;
  const inner = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      {icon ? <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.muted} /> : null}
      <View style={styles.rowText}>
        <Text style={{ color: colour, fontSize: text.body }}>{label}</Text>
        {detail ? <Text style={{ color: colors.muted, fontSize: text.small, lineHeight: 18 }}>{detail}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={[styles.rowValue, { color: colors.muted }]}>{value}</Text> : null}
      {onPress && !danger ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {inner}
    </Pressable>
  );
}

/** A screen that is still fetching what it shows. */
export function Loading() {
  const colors = useColors();
  return (
    <View style={[styles.fill, styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { justifyContent: "center", alignItems: "center" },
  // A tablet or a browser window is wider than a form should be.
  column: { width: "100%", maxWidth: 560, alignSelf: "center", gap: spacing.lg },
  title: { fontSize: text.title, fontWeight: "700", letterSpacing: -0.5 },
  heading: { fontSize: text.label, fontWeight: "600", letterSpacing: 0.1 },
  notice: { borderRadius: radius.md, padding: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  button: { minHeight: 48, borderRadius: radius.full, paddingHorizontal: 20, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center" },
  link: { minHeight: 44, flexDirection: "row", gap: spacing.xs, alignItems: "center", justifyContent: "center" },
  field: { gap: spacing.xs },
  eye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: text.body },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: "hidden" },
  row: { minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowValue: { maxWidth: "50%", fontSize: text.small },
});
