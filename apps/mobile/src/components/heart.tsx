import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { useLikes } from "@/lib/likes";
import { useColors } from "@/lib/theme";

/** The heart on a drink: tap to keep it under Likes, tap again to let it go. */
export function Heart({ id, title, size = 32, style }: { id: string; title: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const likes = useLikes();
  const on = likes.isLiked(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `Remove ${title} from your likes` : `Like ${title}`}
      accessibilityState={{ selected: on }}
      hitSlop={6}
      onPress={() => likes.toggle(id)}
      style={({ pressed }) => [styles.heart, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background }, pressed && { transform: [{ scale: 0.9 }] }, style]}>
      <Ionicons name={on ? "heart" : "heart-outline"} size={Math.round(size * 0.56)} color={on ? colors.brand : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: { alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
