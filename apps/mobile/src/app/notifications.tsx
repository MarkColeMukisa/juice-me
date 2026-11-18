import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, View } from "react-native";

import { Body, Button, Card, Heading, Loading, Notice, Row, Screen } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAlerts } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/cart";
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

/** A dashboard address the app has a screen for: a record's page. */
function screenFor(url: string | null): { slug: string; id: string } | null {
  const match = /^\/dashboard\/([a-z0-9-]+)\/([^/?#]+)$/.exec(url ?? "");
  return match && match[1] !== "account" && match[1] !== "access" ? { slug: match[1], id: decodeURIComponent(match[2]) } : null;
}

/** Everything the bell holds: what needs attention, and what has happened. */
export default function Notifications() {
  const inbox = useLoaded(loadInbox);
  // A customer opens their own order on its Juice Me page, not the general record screen.
  const { shell } = useAuth();
  const shop = useShop();
  // Leaving the bell: the badges elsewhere catch up with what was read here.
  const { refresh: refreshAlerts } = useAlerts();
  useFocusEffect(useCallback(() => () => void refreshAlerts(), [refreshAlerts]));
  const [failed, setFailed] = useState<unknown>(null);

  if (inbox.loading) return <Loading />;

  const markAllRead = async () => {
    setFailed(null);
    try {
      await api.post("/_nevela/notifications/read");
    } catch (caught) {
      setFailed(caught);
    }
    await inbox.reload();
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
                const target = screenFor(item.url);
                return (
                  <Row
                    key={item.id}
                    icon={item.read ? "ellipse-outline" : "ellipse"}
                    label={item.count > 1 ? `${item.title} (${item.count})` : item.title}
                    detail={[item.body, ago(item.at)].filter(Boolean).join(" · ")}
                    onPress={target ? () => (shell === "customer" && shop && target.slug === shop.orders.slug ? router.push({ pathname: "/order/[id]", params: { id: target.id } }) : router.push({ pathname: "/r/[slug]/[id]", params: target })) : undefined}
                    last={index === all.length - 1}
                  />
                );
              })}
            </Card>
          )}
          {inbox.data.unread > 0 ? <Button variant="link" label="Mark all as read" onPress={markAllRead} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
