import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Step } from "@/components/record-history";
import { spacing, text, useColors } from "@/lib/theme";

/** An order's stages, in a customer's words. */
const STAGES = ["pending", "accepted", "preparing", "ready", "completed"] as const;
type Stage = (typeof STAGES)[number];

const TITLE: Record<Stage, string> = {
  pending: "Order placed",
  accepted: "Accepted by the bar",
  preparing: "Being made",
  ready: "Ready",
  completed: "Completed",
};

/** What the customer is told while their order is at a stage. */
function hint(stage: Stage, delivery: string): string {
  switch (stage) {
    case "pending":
      return "Waiting for the bar to accept it.";
    case "accepted":
      return "The bar has your order and will start on it soon.";
    case "preparing":
      return "Your drinks are being made now.";
    case "ready":
      return delivery === "delivery" ? "On its way to you." : "Collect it at the bar.";
    case "completed":
      return "Enjoy your drinks!";
  }
}

/** "18 Nov, 10:32", or "10:32" today. */
export function when(at: string | null | undefined): string {
  if (!at) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === new Date().toDateString() ? time : `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${time}`;
}

/**
 * Where the order has got to, top to bottom: each stage it has passed with the time it got
 * there (from the order's history), the one it is at with what that means, and those still
 * ahead. A cancelled order stops where it was cancelled, with who cancelled it and why.
 */
export function OrderTimeline({ status, placedAt, delivery, steps, you }: { status: string; placedAt: string | null; delivery: string; steps: Step[]; you: string | null }) {
  const colors = useColors();
  // When it reached each stage: the last step that moved it there.
  const reached = new Map<string, Step>();
  for (const step of steps) {
    const to = step.changes.status?.to;
    if (typeof to === "string") reached.set(to, step);
  }
  const cancelled = status === "cancelled";
  const cancel = reached.get("cancelled");
  // A cancelled order shows the stages it got through, then where it stopped.
  const passed = cancelled ? STAGES.filter((stage) => stage === "pending" || reached.has(stage)) : STAGES.slice();
  const at = cancelled ? -1 : STAGES.indexOf(status as Stage);

  type Item = { key: string; title: string; detail: string; time: string; state: "done" | "now" | "ahead" | "stopped" };
  const items: Item[] = passed.map((stage, index) => ({
    key: stage,
    title: TITLE[stage],
    detail: index === at ? hint(stage, delivery) : "",
    time: stage === "pending" ? when(placedAt) : when(reached.get(stage)?.at),
    state: cancelled || index < at ? "done" : index === at ? (stage === "completed" ? "done" : "now") : "ahead",
  }));
  if (cancelled) {
    const by = cancel?.user ? (cancel.user.id === you ? "you" : "the bar") : null;
    const reason = Object.values(cancel?.input ?? {}).find((value): value is string => typeof value === "string" && value.trim() !== "");
    items.push({ key: "cancelled", title: by ? `Cancelled by ${by}` : "Cancelled", detail: reason ? `“${reason.trim()}”` : "", time: when(cancel?.at), state: "stopped" });
  }

  return (
    <View accessibilityRole="list">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const lit = item.state !== "ahead";
        const dot = item.state === "stopped" ? colors.danger : lit ? colors.accent : colors.border;
        const nextLit = !last && items[index + 1].state !== "ahead";
        return (
          <View key={item.key} accessible accessibilityLabel={`${item.title}${item.time ? `, ${item.time}` : ""}${item.state === "now" ? ", now" : item.state === "ahead" ? ", still to come" : ""}. ${item.detail}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { borderColor: dot, backgroundColor: lit ? dot : "transparent" }, item.state === "now" && { transform: [{ scale: 1.15 }] }]}>
                {item.state === "done" ? <Ionicons name="checkmark" size={13} color="#ffffff" /> : item.state === "stopped" ? <Ionicons name="close" size={13} color="#ffffff" /> : item.state === "now" ? <View style={styles.inner} /> : null}
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: nextLit ? colors.accent : colors.border }]} /> : null}
            </View>
            <View style={[styles.body, !last && { paddingBottom: spacing.lg }]}>
              <View style={styles.head}>
                <Text style={{ flex: 1, color: lit ? colors.text : colors.muted, fontSize: text.body, fontWeight: item.state === "now" || item.state === "stopped" ? "700" : "600" }}>{item.title}</Text>
                {item.time ? <Text style={{ color: colors.muted, fontSize: text.small }}>{item.time}</Text> : null}
              </View>
              {item.detail ? <Text style={{ color: item.state === "stopped" ? colors.text : colors.muted, fontSize: text.small, marginTop: 2 }}>{item.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: spacing.md },
  rail: { alignItems: "center", width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  inner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ffffff" },
  line: { width: 2, flex: 1, marginVertical: 2 },
  body: { flex: 1 },
  head: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
});
