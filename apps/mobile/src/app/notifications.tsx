import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";

import { Body, Button, Card, Heading, Loading, Notice, Row, Screen } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAlerts } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/cart";
import { screenFor } from "@/lib/links";
import { spacing } from "@/lib/theme";
import { useLoaded } from "@/lib/use-loaded";
import { ago } from "@/lib/when";

/** The dashboard's bell, as Laravel serves it (`GET _nevela/notifications`). */
export interface Inbox {
  items: { id: string; title: string; body: string | null; tone: "info" | "warning"; count: number; read: boolean; at: string; url: string | null }[];
  unread: number;
  /** What is wrong with the app right now. Administrators only. */
  conditions: { id: string; title: string; body: string; tone: "info" | "warning" }[];
}

export const loadInbox = () => api.get<Inbox>("/_nevela/notifications");

/** Everything the bell holds: what needs attention, and what has happened. */
export default function Notifications() {
  const inbox = useLoaded(loadInbox);
  // A customer opens their own order on its Juice Me page, not the general record screen.
  const { shell } = useAuth();
  const shop = useShop();
  const { refresh: refreshAlerts } = useAlerts();
  // Opened ones read at once here, before the server has answered.
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const reload = inbox.reload;
  // Coming back to the bell (from what a notice opened): fresh from the server. Leaving it:
  // the badges elsewhere catch up with what was read here.
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void reload();
      seen.current = true;
      return () => void refreshAlerts();
    }, [reload, refreshAlerts]),
  );
  const [failed, setFailed] = useState<unknown>(null);

  if (inbox.loading) return <Loading />;

  const orders = shop ? { slug: shop.orders.slug, staff: shell !== "customer", customer: shell === "customer" } : null;

  const markAllRead = async () => {
    setFailed(null);
    try {
      await api.post("/_nevela/notifications/read");
    } catch (caught) {
      setFailed(caught);
    }
    await inbox.reload();
  };

  /** Tapping a notice reads it, and opens what it is about when the app has a screen for that. */
  const open = (id: string, wasRead: boolean, target: Href | null) => {
    if (!wasRead) {
      setOpened((before) => new Set(before).add(id));
      // The badges catch up once Laravel has it, not before.
      api.post("/_nevela/notifications/read", { id }).then(() => refreshAlerts(), () => undefined);
    }
    if (target) router.push(target);
  };

  const shown = inbox.error ?? failed;

  return (
    <Screen edges={["bottom"]} refreshControl={<RefreshControl refreshing={inbox.refreshing} onRefresh={inbox.refresh} />}>
      {shown ? <Notice>{messageOf(shown)}</Notice> : null}

      {inbox.data && inbox.data.conditions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Heading>Needs attention</Heading>
          <Card>
            {inbox.data.conditions.map((condition, index, all) => (
              <Row key={condition.id} icon={condition.tone === "warning" ? "warning-outline" : "information-circle-outline"} label={condition.title} detail={condition.body} last={index === all.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}

      {inbox.data ? (
        <View style={{ gap: spacing.sm }}>
          <Heading>Notifications</Heading>
          {inbox.data.items.length === 0 ? (
            <Body muted>Nothing yet. A form sent in, a new account or a change to how you sign in will show here.</Body>
          ) : (
            <Card>
              {inbox.data.items.map((item, index, all) => {
                const target = screenFor(item.url, orders);
                const read = item.read || opened.has(item.id);
                return (
                  <Row
                    key={item.id}
                    icon={read ? "ellipse-outline" : "ellipse"}
                    // A grouped title usually says how many already ("5 new accounts").
                    label={item.count > 1 && !item.title.includes(String(item.count)) ? `${item.title} (${item.count})` : item.title}
                    detail={[item.body, ago(item.at)].filter(Boolean).join(" · ")}
                    onPress={target || !read ? () => open(item.id, read, target) : undefined}
                    last={index === all.length - 1}
                  />
                );
              })}
            </Card>
          )}
          {inbox.data.items.some((item) => !item.read && !opened.has(item.id)) ? <Button variant="link" label="Mark all as read" onPress={markAllRead} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
