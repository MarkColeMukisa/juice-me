import { Pressable, StyleSheet, Text } from "react-native";

import { radius, spacing, text, useColors } from "@/lib/theme";

/** A pill that is on or off: a role someone holds, an action a role allows. */
export function Choice({ label, on, onPress, disabled = false }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, { backgroundColor: on ? colors.brandSoft : colors.fill }, disabled && { opacity: 0.45 }]}>
      <Text style={{ color: on ? colors.brand : colors.muted, fontSize: text.label, fontWeight: on ? "600" : "500" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
