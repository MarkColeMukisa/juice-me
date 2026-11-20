import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MOST_OF_ONE } from "@/lib/shop";
import { spacing, text, useColors } from "@/lib/theme";

/** How many: a minus, the number, a plus. Below `min` it reports 0 (the cart takes that as "remove"). */
export function Stepper({ value, onChange, min = 1, label }: { value: number; onChange: (value: number) => void; min?: number; label: string }) {
  const colors = useColors();
  const button = (name: "remove" | "add", to: number, disabled: boolean, what: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what} ${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => onChange(to)}
      style={({ pressed }) => [styles.button, { backgroundColor: colors.fill }, pressed && { transform: [{ scale: 0.95 }] }, disabled && { opacity: 0.45 }]}>
      <Ionicons name={name} size={18} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button("remove", value - 1 < min ? 0 : value - 1, min > 0 && value <= min, "Fewer")}
      <Text accessibilityLabel={`${value} ${label}`} style={{ minWidth: 28, textAlign: "center", color: colors.text, fontSize: text.body, fontWeight: "600" }}>{value}</Text>
      {button("add", value + 1, value >= MOST_OF_ONE, "More")}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  button: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
