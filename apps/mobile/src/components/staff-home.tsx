import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { NothingShared } from "@/components/home-header";
import { statusTone } from "@/components/orders-screen";
import { Notice, Screen, type IconName } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/cart";
import { display } from "@/lib/format";
import { may, optionLabel, useResources, type Resource, type ResourceRecord } from "@/lib/resources";
import { site } from "@/lib/site";
import * as storage from "@/lib/storage";
import { radius, spacing, text, useColors } from "@/lib/theme";
import { useLoaded } from "@/lib/use-loaded";
import { ago } from "@/lib/when";
import { loadInbox, type Inbox } from "../app/notifications";

/** The shop's day, from GET /api/shop-figures (Laravel's ShopFiguresController). */
interface Figures {
  today: { orders: number; sameTimeLastWeek: number };
  pending: number;
  sales: { total: number; week: number; lastWeek: number };
  currency: string;
}

interface Counts {
  total: number;
  week: number;
}

interface Home {
  figures: Figures | null;
  counts: Record<string, Counts | null>;
  recent: ResourceRecord[] | null;
  inbox: Inbox | null;
}

/** What the overview counts, and the quick actions make. */
const CATALOGUE = [
  { slug: "beverages", icon: "cafe-outline" as IconName, add: "Add beverage", addIcon: "add" as IconName },
  { slug: "banners", icon: "image-outline" as IconName, add: "New banner", addIcon: "image-outline" as IconName },
  { slug: "categories", icon: "grid-outline" as IconName, add: "Add category", addIcon: "pricetag-outline" as IconName },
];

/** Notices the person put away, by id: a new one still shows. */
const DISMISSED_KEY = "nevela.dismissed-notices";

function greeting(now: Date): string {
  const hour = now.getHours();
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** UGX 128,400 as "UGX 128K": a figure read at a glance. */
function compactMoney(amount: number, currency: string): string {
  const short = amount >= 1_000_000 ? `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M` : amount >= 1_000 ? `${Math.round(amount / 1_000)}K` : String(Math.round(amount));
  return `${currency} ${short.replace(".0M", "M")}`;
}

/** "+20%" against what came before, or null when there was nothing before to compare with. */
function change(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/**
 * The staff home: the shop's day first (today's orders and what is waiting), quick ways to
 * add to the menu, the menu's numbers, and the latest orders. Every number is the API's.
 */
export function StaffHome() {
  const { user, can } = useAuth();
  const { bySlug, error: describing } = useResources();
  const shop = useShop();
  const colors = useColors();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    storage.getItem(DISMISSED_KEY).then((kept) => setDismissed(kept ? (JSON.parse(kept) as string[]) : [])).catch(() => undefined);
  }, []);

  const catalogue = CATALOGUE.map((entry) => ({ ...entry, resource: bySlug(entry.slug) })).filter((entry): entry is (typeof entry & { resource: Resource }) => entry.resource !== undefined);
  const key = catalogue.map((entry) => entry.slug).join(",");

  const load = useCallback(async (): Promise<Home> => {
    const countOf = (slug: string) =>
      api
        .get<{ total: number; current: number }>(`/${slug}/_stats`, { days: 7 })
        .then((stats) => ({ total: stats.total, week: stats.current }))
        .catch(() => null);
    const [figures, counts, recent, inbox] = await Promise.all([
      can("orders.edit") ? api.get<Figures>("/shop-figures").catch(() => null) : Promise.resolve(null),
      Promise.all(key.split(",").filter(Boolean).map(async (slug) => [slug, await countOf(slug)] as const)),
      shop ? api.get<{ data: ResourceRecord[] }>(`/${shop.orders.slug}`, { perPage: 4, sort: "-createdAt" }).then((page) => page.data).catch(() => null) : Promise.resolve(null),
      loadInbox().catch(() => null),
    ]);
    return { figures, counts: Object.fromEntries(counts), recent, inbox };
    // `key` stands for the resources counted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, can, shop]);

  const home = useLoaded(load);
  if (!user) return null;

  const unread = home.data?.inbox?.unread ?? 0;
  // A newer Nevela is for whoever builds the app (More, About); what matters to the business shows here.
  const notices = (home.data?.inbox?.conditions ?? []).filter((condition) => condition.id !== "release" && !dismissed.includes(condition.id));
  const dismiss = (ids: string[]) => {
    const next = [...new Set([...dismissed, ...ids])];
    setDismissed(next);
    storage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const figures = home.data?.figures ?? null;
  const first = user.name?.trim().split(/\s+/)[0];
  const ordersSlug = shop?.orders.slug;
  const quick = [
    ...catalogue.filter((entry) => may(user, entry.resource, "create")).map((entry) => ({ label: entry.add, icon: entry.addIcon, go: () => router.push({ pathname: "/r/[slug]/new", params: { slug: entry.slug } }) })),
    ...(ordersSlug ? [{ label: "View orders", icon: "list-outline" as IconName, go: () => router.navigate("/orders") }] : []),
  ].slice(0, 4);

  if (catalogue.length === 0 && !shop && !home.loading) return <Screen inTabs><NothingShared /></Screen>;

  const todayChange = figures ? change(figures.today.orders, figures.today.sameTimeLastWeek) : null;
  const salesChange = figures ? change(figures.sales.week, figures.sales.lastWeek) : null;

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} />}>
      {/* The brand, the bell and the person. */}
      <View style={styles.header}>
        <Image source={require("../../assets/images/splash-icon.png")} style={{ width: 44, height: 44 }} contentFit="contain" accessibilityLabel={site.name} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>{site.name}</Text>
          <Text style={{ color: colors.muted, fontSize: text.small }}>Admin dashboard</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={unread > 0 ? `Notifications, ${unread} new` : "Notifications"} hitSlop={6} onPress={() => router.push("/notifications")} style={[styles.round, { backgroundColor: colors.fill }]}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Your account" hitSlop={6} onPress={() => router.push("/profile")}>
          {user.image ? (
            <Image source={{ uri: user.image }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
              <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: text.lead }}>{(user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>
          {greeting(new Date())}
          {first ? `, ${first}` : ""} 👋
        </Text>
        <Text style={{ color: colors.muted, fontSize: text.body }}>Here's what's happening today.</Text>
      </View>

      {notices.length > 0 ? (
        <View style={[styles.notice, { backgroundColor: colors.fill }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.muted} />
          <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => router.push("/notifications")}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: text.small, fontWeight: "500" }}>
              {notices.length === 1 ? notices[0].title : `${notices.length} things need attention`}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={() => dismiss(notices.map((notice) => notice.id))}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}
      {describing ?? home.error ? <Notice>{messageOf(describing ?? home.error)}</Notice> : null}

      {/* Today's orders first: what the shop has to do. */}
      {can("orders.edit") ? (
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/orders")} style={({ pressed }) => [styles.hero, { backgroundColor: colors.brandSoft }, pressed && { opacity: 0.9 }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.background }]}>
            <Ionicons name="bag-handle-outline" size={30} color={colors.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.muted, fontSize: text.body }}>Today's orders</Text>
            <Text style={{ color: colors.text, fontSize: 40, fontWeight: "700", letterSpacing: -1 }}>{figures ? figures.today.orders : home.loading ? "…" : "—"}</Text>
            {figures ? (
              todayChange === null ? (
                <Text style={{ color: colors.muted, fontSize: text.small }}>{figures.today.sameTimeLastWeek === 0 && figures.today.orders > 0 ? "None by now last week" : "Same time last week: none"}</Text>
              ) : (
                <View style={styles.trend}>
                  <Ionicons name={todayChange >= 0 ? "arrow-up" : "arrow-down"} size={14} color={todayChange >= 0 ? colors.success : colors.danger} />
                  <Text style={{ color: todayChange >= 0 ? colors.success : colors.danger, fontSize: text.small, fontWeight: "700" }}>{Math.abs(todayChange)}%</Text>
                  <Text style={{ color: colors.muted, fontSize: text.small }}>vs same time last week</Text>
                </View>
              )
            ) : null}
          </View>
          {figures && figures.pending > 0 ? (
            <View style={[styles.pending, { backgroundColor: colors.background }]}>
              <Ionicons name="time-outline" size={14} color={colors.brand} />
              <Text style={{ color: colors.brand, fontSize: text.caption, fontWeight: "700" }}>{figures.pending} pending</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {quick.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <SectionHead title="Quick actions" more={catalogue.length > 0 ? { label: "See all", go: () => router.navigate("/records") } : undefined} />
          <View style={styles.quick}>
            {quick.map((action, index) => {
              const primary = index === 0;
              return (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={action.go}
                  style={({ pressed }) => [styles.tile, primary ? { backgroundColor: colors.brand } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }, pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Ionicons name={action.icon} size={24} color={primary ? colors.onBrand : colors.brand} />
                  <Text numberOfLines={2} style={{ color: primary ? colors.onBrand : colors.text, fontSize: text.caption, fontWeight: "600", textAlign: "center" }}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {catalogue.length > 0 || figures ? (
        <View style={{ gap: spacing.md }}>
          <SectionHead title="Overview" />
          <View style={styles.grid}>
            {catalogue.map((entry) => {
              const counts = home.data?.counts[entry.slug];
              return (
                <Stat
                  key={entry.slug}
                  icon={entry.icon}
                  value={counts ? counts.total.toLocaleString() : home.loading ? "…" : "—"}
                  label={entry.resource.pluralLabel}
                  pill={counts ? (counts.week > 0 ? { text: `${counts.week} new`, up: true } : { text: "Stable", up: null }) : null}
                  onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: entry.slug } })}
                />
              );
            })}
            {figures ? (
              <Stat
                icon="cart-outline"
                value={compactMoney(figures.sales.total, figures.currency)}
                label="Total sales"
                pill={salesChange === null ? null : { text: `${Math.abs(salesChange)}%`, up: salesChange >= 0 }}
                onPress={() => router.navigate("/orders")}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {shop && home.data?.recent ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHead title="Recent activity" more={{ label: "See all", go: () => router.navigate("/orders") }} />
          {home.data.recent.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: text.body }}>No orders yet. New ones show up here.</Text>
          ) : (
            <View>
              {home.data.recent.map((order, index, all) => {
                const status = String(order.status ?? "");
                const tone = statusTone(status, colors);
                const items = Array.isArray(order.items) ? (order.items as ResourceRecord[]) : [];
                const count = items.reduce((sum, item) => sum + (Number(item[shop.quantity]) || 0), 0);
                const done = status === "completed";
                const label = shop.orders.fields.status && status ? optionLabel(shop.orders.fields.status, status) : null;
                const total = shop.orders.fields.total && order.total != null ? display(shop.orders.fields.total, order.total) : null;
                return (
                  <Pressable
                    key={String(order.id)}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/r/[slug]/[id]", params: { slug: shop.orders.slug, id: String(order.id) } })}
                    style={({ pressed }) => [styles.activity, index < all.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
                    <View style={[styles.activityIcon, { backgroundColor: done ? colors.successSoft : tone.bg }]}>
                      <Ionicons name={done ? "checkmark" : status === "cancelled" ? "close" : "bag-handle-outline"} size={20} color={done ? colors.success : tone.fg} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>Order {String(order.number ?? "")}</Text>
                      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: text.small }}>
                        {String(order.customer ?? "A customer")}
                        {count > 0 ? ` · ${count === 1 ? "1 drink" : `${count} drinks`}` : ""}
                        {total ? ` · ${total}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {label ? (
                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                          <Text style={{ color: tone.fg, fontSize: text.caption, fontWeight: "600" }}>{label}</Text>
                        </View>
                      ) : null}
                      <Text style={{ color: colors.faint, fontSize: text.tiny }}>{ago(String(order.createdAt ?? ""))}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function SectionHead({ title, more }: { title: string; more?: { label: string; go: () => void } }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 }}>{title}</Text>
      {more ? (
        <Pressable accessibilityRole="link" hitSlop={8} onPress={more.go} style={styles.more}>
          <Text style={{ color: colors.brand, fontSize: text.label, fontWeight: "600" }}>{more.label}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Stat({ icon, value, label, pill, onPress }: { icon: IconName; value: string; label: string; pill: { text: string; up: boolean | null } | null; onPress: () => void }) {
  const colors = useColors();
  const tone = pill?.up === true ? { fg: colors.success, bg: colors.successSoft } : pill?.up === false ? { fg: colors.danger, bg: colors.dangerSoft } : { fg: colors.muted, bg: colors.fill };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: colors.brandSoft }]}>
          <Ionicons name={icon} size={22} color={colors.brand} />
        </View>
        {pill ? (
          <View style={[styles.statPill, { backgroundColor: tone.bg }]}>
            {pill.up !== null ? <Ionicons name={pill.up ? "arrow-up" : "arrow-down"} size={11} color={tone.fg} /> : <Text style={{ color: tone.fg, fontSize: 11 }}>–</Text>}
            <Text style={{ color: tone.fg, fontSize: text.tiny, fontWeight: "600" }}>{pill.text}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>{value}</Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: text.small }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.lg, borderRadius: radius.xl, padding: spacing.xl },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  trend: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  pending: { position: "absolute", top: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  more: { flexDirection: "row", alignItems: "center", gap: 4 },
  quick: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1, minHeight: 92, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { flexBasis: "47%", flexGrow: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.sm },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statPill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  activity: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  activityIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
});
