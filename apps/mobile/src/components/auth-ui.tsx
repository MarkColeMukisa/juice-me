import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { site } from "@/lib/site";
import { spacing, text, useColors } from "@/lib/theme";

/**
 * The pieces sign-in and sign-up share: soft orange shapes in the corners, the brand with room
 * around it, an "or" line, and quiet text links where only the action is orange.
 */

/** Two soft shapes in the corners. On black they would only shout, so the dark screens go without. */
export function AuthBackdrop() {
  const colors = useColors();
  if (colors.background === "#000000") return null;
  return (
    <>
      <View style={[styles.blob, { top: -150, left: -120, width: 300, height: 300, backgroundColor: colors.brandSoft }]} />
      <View style={[styles.blob, { top: -60, left: -150, width: 220, height: 220, backgroundColor: "#FFE2CC", opacity: 0.55 }]} />
      <View style={[styles.blob, { bottom: -140, right: -110, width: 280, height: 280, backgroundColor: colors.brandSoft }]} />
    </>
  );
}

/** The logo, the name large, and a line under it. */
export function AuthBrand({ title = site.name, subtitle }: { title?: string; subtitle: string }) {
  const colors = useColors();
  return (
    <View style={styles.brand}>
      <Logo size={96} />
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 40, fontWeight: "800", letterSpacing: -1.2, textAlign: "center" }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 17, textAlign: "center", lineHeight: 23 }}>{subtitle}</Text>
    </View>
  );
}

/** A thin line with "or" in it, before the other ways in. */
export function OrDivider() {
  const colors = useColors();
  return (
    <View style={styles.or}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={{ color: colors.muted, fontSize: text.body }}>or</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

/** "New here? Create an account": the words in grey, the part you tap in orange. */
export function TextAction({ lead, action, onPress, disabled = false }: { lead?: string; action: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={lead ? `${lead} ${action}` : action} disabled={disabled} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.action, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={{ color: colors.muted, fontSize: text.lead, textAlign: "center" }}>
        {lead ? `${lead} ` : ""}
        <Text style={{ color: colors.brand, fontWeight: "600" }}>{action}</Text>
      </Text>
    </Pressable>
  );
}

/** "Keep browsing →": a way out that doesn't compete with signing in. */
export function QuietAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.action, styles.quiet, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={{ color: colors.text, fontSize: text.lead, fontWeight: "600" }}>{label}</Text>
      <Ionicons name="arrow-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 999 },
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  or: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  action: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  quiet: { flexDirection: "row", gap: 6 },
});
