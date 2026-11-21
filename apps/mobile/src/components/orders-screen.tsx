import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Picture } from "@/components/pictures";
import { Body, Button, Notice, Screen, Title } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/cart";
import { display } from "@/lib/format";
import { optionLabel, type ResourceRecord } from "@/lib/resources";
import { titleFieldOf, totalFieldOf, type Shop } from "@/lib/shop";
import { pictureOf, titleOf } from "@/lib/shop-item";
import { radius, spacing, text, useColors, type Colors } from "@/lib/theme";
import { ago } from "@/lib/when";

/** The three ways to look at orders, and the statuses each one holds. */
const VIEWS = {
  active: { label: "Active", statuses: ["pending", "accepted", "preparing", "ready"] },
  completed: { label: "Completed", statuses: ["completed"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
} as const;
type Tab = keyof typeof VIEWS;

const PER_STATUS = 30;

/** The colour an order's status is shown in: orange while it waits on the shop, blue under way, green done, red cancelled. */
export function statusTone(status: string, colors: Colors): { fg: string; bg: string } {
  if (status === "cancelled") return { fg: colors.danger, bg: colors.dangerSoft };
  if (status === "ready" || status === "completed") return { fg: colors.success, bg: colors.successSoft };
  if (status === "accepted" || status === "preparing") return { fg: colors.info, bg: colors.infoSoft };
  return { fg: colors.brand, bg: colors.brandSoft };
}

/** The menu, asked for once and kept: the order cards show each drink's picture and name from it. */
let menuCache: { slug: string; records: Map<string, ResourceRecord> } | null = null;

function useMenu(shop: Shop | null): Map<string, ResourceRecord> {
  const [menu, setMenu] = useState<Map<string, ResourceRecord>>(menuCache && shop && menuCache.slug === shop.catalogue.slug ? menuCache.records : new Map());
  useEffect(() => {
    if (!shop || (menuCache && menuCache.slug === shop.catalogue.slug)) return;
    let live = true;
    api
      .get<{ data: ResourceRecord[] }>(`/${shop.catalogue.slug}`, { perPage: 100 })
      .then((answer) => {
        menuCache = { slug: shop.catalogue.slug, records: new Map(answer.data.map((record) => [String(record.id), record])) };
        if (live) setMenu(menuCache.records);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [shop]);
  return menu;
}

/**
 * Orders as cards: Active, Completed and Cancelled, each with its count. A customer sees their
 * own ("My orders"); staff, who may edit orders, see everyone's, with who ordered.
 */
export function OrdersScreen() {
  const shop = useShop();
  const { can } = useAuth();
  const colors = useColors();
  const staff = can("orders.edit");
  const menu = useMenu(shop);
  const [view, setView] = useState<Tab>("active");
  const [orders, setOrders] = useState<ResourceRecord[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (which: Tab) => {
      if (!shop) return;
      setError(null);
      try {
        // Laravel filters on one status at a time: each is asked for, and the answers put together, newest first.
        const [pages, stats] = await Promise.all([
          Promise.all(VIEWS[which].statuses.map((status) => api.get<{ data: ResourceRecord[] }>(`/${shop.orders.slug}`, { perPage: PER_STATUS, sort: "-createdAt", "filter[status]": status }))),
          api.get<{ values: Record<string, number> }>(`/${shop.orders.slug}/_stats`, { field: "status" }).catch(() => null),
        ]);
        setOrders(pages.flatMap((page) => page.data).sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))));
        if (stats) setCounts(stats.values);
      } catch (caught) {
        setError(caught);
        setOrders((current) => current ?? []);
      }
    },
    [shop],
  );

  useEffect(() => {
    setOrders(null);
    void load(view);
  }, [view, load]);

  // Looked at again each time the tab is opened: a status changes while the app is closed.
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void load(view);
    }, [load, view]),
  );

  if (!shop) {
    return (
      <Screen inTabs>
        <Title>Orders</Title>
        <Body muted>There is nothing to order in this app.</Body>
      </Screen>
    );
  }

  const countOf = (which: Tab) => VIEWS[which].statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const status = shop.orders.fields.status;
  const total = totalFieldOf(shop.orders);
  const number = titleFieldOf(shop.orders);

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(view); setRefreshing(false); }} />}>
      <View style={{ gap: 4 }}>
        <Title>{staff ? "Orders" : "My orders"}</Title>
        <Body muted>{staff ? "Every order, newest first. Tap one to move it along." : "Keep track of your purchases."}</Body>
      </View>

      <View style={styles.chips}>
        {(Object.keys(VIEWS) as Tab[]).map((which) => {
          const on = which === view;
          const count = countOf(which);
          return (
            <Pressable
              key={which}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setView(which)}
              style={({ pressed }) => [styles.chip, { backgroundColor: on ? colors.brandSoft : colors.fill }, pressed && { transform: [{ scale: 0.98 }] }]}>
              <Text style={{ color: on ? colors.brand : colors.muted, fontSize: text.label, fontWeight: on ? "600" : "500" }}>
                {VIEWS[which].label}
                {which === "active" && count > 0 ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Notice>{messageOf(error)}</Notice> : null}

      {orders === null ? (
        <View style={{ padding: spacing.xl }}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Body muted center>{view === "active" ? (staff ? "No orders waiting. New ones show up here." : "Nothing on the way right now.") : view === "completed" ? "No completed orders yet." : "No cancelled orders."}</Body>
          {!staff && view === "active" ? <Button label="Order a drink" onPress={() => router.navigate("/")} /> : null}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {orders.map((order) => (
            <OrderCard
              key={String(order.id)}
              order={order}
              shop={shop}
              menu={menu}
              staff={staff}
              number={String(order[number] ?? "Order")}
              statusLabel={status && order.status ? optionLabel(status, String(order.status)) : null}
              totalText={total && order[total[0]] !== null && order[total[0]] !== undefined ? display(total[1], order[total[0]]) : null}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function OrderCard({ order, shop, menu, staff, number, statusLabel, totalText }: { order: ResourceRecord; shop: Shop; menu: Map<string, ResourceRecord>; staff: boolean; number: string; statusLabel: string | null; totalText: string | null }) {
  const colors = useColors();
  const tone = statusTone(String(order.status ?? ""), colors);
  // The list brings what is in each order (an older server doesn't: the card does without).
  const items = Array.isArray(order.items) ? (order.items as ResourceRecord[]) : [];
  const drinks = items.map((item) => menu.get(String(item[shop.product] ?? "")) ?? null);
  const firstDrink = drinks[0] ?? null;
  const count = items.reduce((sum, item) => sum + (Number(item[shop.quantity]) || 0), 0);
  const others = drinks.slice(1).map((drink) => (drink ? titleOf(shop, drink) : null)).filter(Boolean) as string[];
  const name = firstDrink ? titleOf(shop, firstDrink) : items.length > 0 ? "A drink" : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number}${statusLabel ? `, ${statusLabel}` : ""}${totalText ? `, ${totalText}` : ""}`}
      onPress={() => (staff ? router.push({ pathname: "/r/[slug]/[id]", params: { slug: shop.orders.slug, id: String(order.id) } }) : router.push({ pathname: "/order/[id]", params: { id: String(order.id) } }))}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.99 }], opacity: 0.9 }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: text.lead, fontWeight: "700" }}>{number}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: text.small }}>
            {staff && order.customer ? `${String(order.customer)} · ` : ""}
            {ago(String(order.createdAt ?? ""))}
          </Text>
        </View>
        {statusLabel ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={{ color: tone.fg, fontSize: text.caption, fontWeight: "600" }}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>

      {name ? (
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          <View style={[styles.thumb, { backgroundColor: colors.fill }]}>
            <Picture file={firstDrink ? pictureOf(shop, firstDrink) : null} size={56} rendition="thumb" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>{name}</Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: text.small }}>
              {count === 1 ? "1 item" : `${count} items`}
              {others.length > 0 ? ` · ${others.join(", ")}` : ""}
            </Text>
            {totalText ? <Text style={{ color: colors.text, fontSize: text.body, fontWeight: "700", marginTop: 2 }}>{totalText}</Text> : null}
          </View>
        </View>
      ) : totalText ? (
        <Text style={{ color: colors.text, fontSize: text.body, fontWeight: "700" }}>{totalText}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 34, paddingHorizontal: 14, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: spacing.xxl, gap: spacing.lg, alignItems: "stretch" },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardBody: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: "hidden" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
});
