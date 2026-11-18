import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { OrderTimeline, when } from "@/components/order-timeline";
import { Picture } from "@/components/pictures";
import { RecordActions } from "@/components/record-actions";
import type { Step } from "@/components/record-history";
import { Body, Button, Card, Heading, Loading, Notice, Row, Screen } from "@/components/ui";
import { api, ApiError, messageOf } from "@/lib/api";
import { useAlerts } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useCart, useShop } from "@/lib/cart";
import { display } from "@/lib/format";
import type { ResourceRecord } from "@/lib/resources";
import { cartItemOf, isAvailable, pictureOf, titleOf } from "@/lib/shop-item";
import { totalFieldOf, type Shop } from "@/lib/shop";
import { spacing, text, useColors } from "@/lib/theme";
import { useLoaded } from "@/lib/use-loaded";

/** Stages at which nothing more will happen to an order. */
const OVER = ["completed", "cancelled"];
/** How often an open order is looked at again while its page is open. */
const EVERY_MS = 15000;

/**
 * A customer's order, as Juice Me shows it: where it has got to and when, what is in it with
 * pictures, what it came to, how it reaches them, and cancelling it while it can be. Done or
 * cancelled, it can be ordered again in one tap.
 */
export default function OrderPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shop = useShop();
  if (!shop) {
    return (
      <Screen edges={["bottom"]}>
        <Body muted>There is nothing to order in this app.</Body>
      </Screen>
    );
  }
  return <Order shop={shop} id={id} />;
}

function Order({ shop, id }: { shop: Shop; id: string }) {
  const { user } = useAuth();
  const cart = useCart();
  const colors = useColors();
  const path = `/${shop.orders.slug}/${encodeURIComponent(id)}`;
  const order = useLoaded(useCallback(() => api.get<ResourceRecord>(path), [path]));
  const [steps, setSteps] = useState<Step[]>([]);
  const [drinks, setDrinks] = useState<Record<string, ResourceRecord | null>>({});
  const [said, setSaid] = useState<string | null>(null);

  const loadSteps = useCallback(async () => {
    try {
      setSteps((await api.get<{ data: Step[] }>(`/_nevela/history/${shop.orders.slug}/${encodeURIComponent(id)}`)).data);
    } catch {
      // No history yet: the timeline still shows where it is.
    }
  }, [shop, id]);
  useEffect(() => {
    void loadSteps();
  }, [loadSteps]);

  const data = order.data;
  const status = String(data?.status ?? "");
  const { reload } = order;

  // News about this order (from the bell) is seen here: shown, then marked read. One that
  // arrives while the page is open moves it on at once, without waiting for its own turn.
  const alerts = useAlerts();
  const news = alerts.unreadAbout(shop.orders.slug, id).map((item) => item.id).join(",");
  const { markRead } = alerts;
  useEffect(() => {
    if (!news || !data) return;
    void markRead(news.split(","));
    void reload();
    void loadSteps();
    // The ids say when there is news; the order being there is what lets it be read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news, data !== null && data !== undefined]);

  // While it is still moving, it is looked at again every few seconds: the bar accepts it,
  // makes it, and the customer sees each step without pulling down.
  const moving = data !== null && data !== undefined && !OVER.includes(status);
  useEffect(() => {
    if (!moving) return;
    const timer = setInterval(() => {
      void reload();
      void loadSteps();
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [moving, reload, loadSteps]);

  // Back to this page from elsewhere: it may have moved meanwhile.
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void reload();
      void loadSteps();
    }, [reload, loadSteps]),
  );

  // The drinks in it, for their pictures and names: as the menu has them now.
  const items = Array.isArray(data?.items) ? (data.items as ResourceRecord[]) : [];
  const wanted = [...new Set(items.map((item) => String(item[shop.product] ?? "")).filter(Boolean))].join(",");
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    (async () => {
      const found = await Promise.all(
        wanted.split(",").map(async (drink) => {
          try {
            return [drink, await api.get<ResourceRecord>(`/${shop.catalogue.slug}/${encodeURIComponent(drink)}`)] as const;
          } catch (caught) {
            // Taken off the menu: said so. No signal: left blank.
            return caught instanceof ApiError && caught.status === 404 ? ([drink, null] as const) : null;
          }
        }),
      );
      if (live) setDrinks((current) => ({ ...current, ...Object.fromEntries(found.filter((pair) => pair !== null)) }));
    })();
    return () => {
      live = false;
    };
  }, [wanted, shop]);

  if (order.loading) return <Loading />;
  if (!data) {
    const gone = order.error instanceof ApiError && order.error.status === 404;
    return (
      <Screen edges={["bottom"]}>
        <Stack.Screen options={{ title: "Order" }} />
        <Notice>{gone ? "This order isn't there. It may not be yours." : messageOf(order.error)}</Notice>
      </Screen>
    );
  }

  // The line's own price is what was charged: copied from the menu when the order was placed.
  const lineMoney = Object.values(shop.lines.fields).find((field) => field.kind === "float" && field.format === "money") ?? (shop.price ? shop.catalogue.fields[shop.price] : undefined);
  const linePrice = Object.entries(shop.lines.fields).find(([, field]) => field === lineMoney)?.[0] ?? "price";
  const total = totalFieldOf(shop.orders);
  const money = (amount: number) => (lineMoney ? display(lineMoney, amount) : String(amount));
  const delivery = String(data.delivery ?? "collection");
  const over = OVER.includes(status);
  const statusField = shop.orders.fields.status;
  const badge = status === "cancelled" ? colors.danger : status === "completed" ? colors.success : colors.accent;
  const statusName = statusField?.optionLabels?.[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

  // Done or cancelled: the same again, what can still be had, in the cart.
  const available = items.filter((item) => {
    const drink = drinks[String(item[shop.product] ?? "")];
    return drink && isAvailable(shop, drink);
  });
  const again = () => {
    for (const item of available) {
      const drink = drinks[String(item[shop.product] ?? "")];
      if (drink) cart.add(cartItemOf(shop, drink), Number(item[shop.quantity] ?? 1));
    }
    router.navigate("/cart");
  };

  return (
    <Screen
      edges={["bottom"]}
      refreshControl={
        <RefreshControl
          refreshing={order.refreshing}
          onRefresh={() => {
            setSaid(null);
            void order.refresh();
            void loadSteps();
          }}
        />
      }>
      <Stack.Screen options={{ title: String(data.number ?? "Order") }} />

      <View style={styles.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" selectable style={{ color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.4 }}>
            {String(data.number ?? "Order")}
          </Text>
          <Body muted small>Placed {when(String(data.createdAt ?? ""))}</Body>
        </View>
        <View style={[styles.badge, { backgroundColor: badge }]}>
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: text.small }}>{statusName}</Text>
        </View>
      </View>

      {order.error ? <Notice>Couldn't refresh this order, so it may have moved on. {messageOf(order.error)}</Notice> : null}
      {said ? <Notice tone="success">{said}</Notice> : null}

      <Card>
        <View style={{ padding: spacing.lg }}>
          <OrderTimeline status={status} placedAt={String(data.createdAt ?? "")} delivery={delivery} steps={steps} you={user ? String(user.id) : null} />
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Heading>Your drinks</Heading>
        <Card>
          {items.map((item, index) => {
            const drink = drinks[String(item[shop.product] ?? "")];
            const quantity = Number(item[shop.quantity] ?? 1);
            const price = Number(item[linePrice] ?? 0);
            const open = drink ? () => router.push({ pathname: "/shop/[id]", params: { id: drink.id } }) : undefined;
            return (
              <Pressable
                key={String(item.id ?? index)}
                accessibilityRole={open ? "button" : undefined}
                disabled={!open}
                onPress={open}
                style={({ pressed }) => [styles.line, index < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
                <Picture file={drink ? pictureOf(shop, drink) : null} size={56} rendition="thumb" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={2} style={{ color: drink === null ? colors.muted : colors.text, fontSize: text.body, fontWeight: "600" }}>
                    {drink ? titleOf(shop, drink) : drink === null ? "No longer on the menu" : " "}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: text.small }}>
                    {quantity} × {money(price)}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>{money(price * quantity)}</Text>
              </Pressable>
            );
          })}
          {total && data[total[0]] !== null && data[total[0]] !== undefined ? (
            <View style={[styles.total, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: text.body, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>{display(total[1], data[total[0]])}</Text>
            </View>
          ) : null}
        </Card>
        {status !== "cancelled" ? <Body muted small>{delivery === "delivery" ? "Pay when it's delivered." : "Pay when you collect it."}</Body> : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>{delivery === "delivery" ? "Delivery" : "Collection"}</Heading>
        <Card>
          <Row
            icon={delivery === "delivery" ? "bicycle-outline" : "storefront-outline"}
            label={delivery === "delivery" ? "Delivered to you" : "Collect at the bar"}
            detail={data.details ? String(data.details) : null}
            last={!data.phone}
          />
          {data.phone ? <Row icon="call-outline" label="Phone" value={String(data.phone)} last /> : null}
        </Card>
      </View>

      <RecordActions
        resource={shop.orders}
        record={data}
        onDone={(_, message) => {
          setSaid(message);
          void order.reload();
          void loadSteps();
        }}
      />

      {over && available.length > 0 ? <Button label="Order again" icon="refresh" onPress={again} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 14 },
  line: { padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  total: { padding: spacing.md, borderTopWidth: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
});
