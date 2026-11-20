import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { Heart } from "@/components/heart";
import { HomeHeader } from "@/components/home-header";
import { Picture } from "@/components/pictures";
import { Body, Button, Notice, Screen } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAlerts } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useAddToCart, useCart } from "@/lib/cart";
import { display, type StoredFile } from "@/lib/format";
import { readPath, recordKey } from "@/lib/guest";
import { useResources, type ResourceRecord } from "@/lib/resources";
import type { Catalogue } from "@/lib/shop";
import { cartItemOf, pictureOf, priceOf, titleOf } from "@/lib/shop-item";
import { radius, spacing, text, useColors } from "@/lib/theme";
import { useLoaded } from "@/lib/use-loaded";

const PER_PAGE = 20;
/** How long each banner stays before the next slides in. */
const BANNER_MS = 4500;

interface Page {
  data: ResourceRecord[];
  meta: { page: number; totalPages: number; total: number };
}

/** A record's picture, as Laravel sends it beside the record: `imageFile`. */
const pictureOfRecord = (record: ResourceRecord, field = "image") => (record[`${field}File`] as StoredFile | null | undefined) ?? null;

/**
 * Juice Me's home: the day's banners, the kinds of drink as round pictures, today's specials,
 * and every drink, to search and add to the cart. The banners and specials are the bar's to
 * change, in the dashboard: Banners, and "Featured" on a drink.
 */
export function JuiceHome({ shop }: { shop: Catalogue }) {
  const colors = useColors();
  const cart = useCart();
  const add = useAddToCart();
  const { user } = useAuth();
  const { byName } = useResources();
  // The bell, kept current while the app is open (lib/alerts). A guest has none.
  const alerts = useAlerts();
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<ResourceRecord[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const latest = useRef(0);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [drinksAt, setDrinksAt] = useState(0);

  const priceField = shop.price ? shop.catalogue.fields[shop.price] : null;
  const grouping = shop.category ? shop.catalogue.fields[shop.category] : undefined;
  const categoryResource = grouping?.target ? byName(grouping.target) : undefined;
  const bannerResource = byName("Banner");

  const categories = useLoaded(
    useCallback(async () => (categoryResource ? (await api.get<{ data: ResourceRecord[] }>(readPath(categoryResource), { perPage: 30, sort: "name" }, { auth: !categoryResource.open })).data : []), [categoryResource]),
  );
  const banners = useLoaded(
    useCallback(async () => (bannerResource ? (await api.get<{ data: ResourceRecord[] }>(readPath(bannerResource), { perPage: 10, sort: "position", "filter[active]": true }, { auth: !bannerResource.open })).data : []), [bannerResource]),
  );
  const specials = useLoaded(
    useCallback(async () => {
      const asked: Record<string, string | number | boolean> = { perPage: 10, "filter[featured]": true };
      if (shop.available) asked[`filter[${shop.available}]`] = true;
      return (await api.get<Page>(readPath(shop.catalogue), asked, { auth: !shop.catalogue.open })).data;
    }, [shop]),
  );

  const load = useCallback(
    async (wanted: number, words: string, chosen: string | null) => {
      const mine = ++latest.current;
      try {
        const asked: Record<string, string | number | boolean> = { page: wanted, perPage: PER_PAGE, q: words.trim(), sort: "name" };
        if (shop.category && chosen) asked[`filter[${shop.category}]`] = chosen;
        if (shop.available) asked[`filter[${shop.available}]`] = true;
        const answer = await api.get<Page>(readPath(shop.catalogue), asked, { auth: !shop.catalogue.open });
        if (mine !== latest.current) return;
        setItems((current) => (wanted === 1 ? answer.data : [...current, ...answer.data.filter((record) => !current.some((had) => had.id === record.id))]));
        setPage(answer.meta.page);
        setPages(answer.meta.totalPages);
        setError(null);
      } catch (caught) {
        if (mine === latest.current) setError(caught);
      } finally {
        if (mine === latest.current) setLoading(false);
      }
    },
    [shop],
  );

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    load(1, query, category);
  }, [load, query, category]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(1, query, category), alerts.refresh(), categories.refresh(), banners.refresh(), specials.refresh()]);
    setRefreshing(false);
  };

  // A banner or a tile opens its kind of drink: the list below, narrowed to it.
  const show = (id: string | null) => {
    setCategory(id);
    setSearch("");
    scroller.current?.scrollTo({ y: Math.max(0, drinksAt - spacing.md), animated: true });
  };

  const inCart = (id: string) => cart.lines.find((line) => line.id === id)?.quantity ?? 0;
  const searching = query.trim() !== "";
  const chosenName = categories.data?.find((record) => record.id === category)?.name;

  const addButton = (item: ResourceRecord, size = 34) => {
    const count = inCart(item.id);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${titleOf(shop, item)} to the cart`}
        hitSlop={6}
        onPress={() => add(cartItemOf(shop, item))}
        style={[styles.add, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand }]}>
        {count > 0 ? <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: text.small }}>{count}</Text> : <Ionicons name="add" size={20} color={colors.onBrand} />}
      </Pressable>
    );
  };

  return (
    <Screen inTabs scrollRef={scroller} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <HomeHeader unread={alerts.unread} />

      <View style={[styles.search, { backgroundColor: colors.fill }]}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search"
          placeholder="Search juices, smoothies, coffee…"
          placeholderTextColor={colors.faint}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear the search" hitSlop={8} onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {!searching && (banners.data?.length ?? 0) > 0 ? <Banners banners={banners.data ?? []} width={width - spacing.lg * 2} onOpen={(banner) => show((banner.categoryId as string | null) ?? null)} /> : null}

      {!searching && (categories.data?.length ?? 0) > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.heading, { color: colors.text }]}>What are you drinking?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg }} style={{ marginHorizontal: -spacing.lg }}>
            {(categories.data ?? []).map((record) => {
              const on = record.id === category;
              return (
                <Pressable key={record.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => show(on ? null : record.id)} style={styles.tile}>
                  <View style={[styles.tileRing, { borderColor: on ? colors.brand : "transparent" }]}>
                    <Picture file={pictureOfRecord(record)} size={68} shape="round" rendition="thumb" />
                  </View>
                  <Text numberOfLines={1} style={{ color: on ? colors.brand : colors.text, fontSize: text.small, fontWeight: "600" }}>{String(record.name ?? "")}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {!searching && !category && (specials.data?.length ?? 0) > 0 ? (
        <View style={styles.specials}>
          <View style={styles.specialsHead}>
            <View style={[styles.specialsIcon, { backgroundColor: colors.brandSoft }]}>
              <Ionicons name="sparkles" size={16} color={colors.brand} />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Today's specials</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }} style={{ marginHorizontal: -spacing.lg }}>
            {(specials.data ?? []).map((item) => {
              const price = priceOf(shop, item);
              return (
                <View key={item.id} style={[styles.special, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/shop/[id]", params: { id: recordKey(shop.catalogue, item) } })}>
                    <Picture file={pictureOf(shop, item)} size="fill" rendition="card" />
                    <View style={{ padding: spacing.sm, gap: 2 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "700", fontSize: text.small }}>{titleOf(shop, item)}</Text>
                      {price !== null && priceField ? <Text style={{ color: colors.brand, fontWeight: "700", fontSize: text.small }}>{display(priceField, price)}</Text> : null}
                    </View>
                  </Pressable>
                  {/* Beside the card's button, not in it: a button can't hold another. */}
                  {addButton(item, 32)}
                  <Heart id={item.id} title={titleOf(shop, item)} size={30} style={styles.heart} />
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View onLayout={(event) => setDrinksAt(event.nativeEvent.layout.y)} style={styles.drinksHead}>
        <Text style={[styles.heading, { color: colors.text }]}>{searching ? `Results for “${query.trim()}”` : chosenName ? String(chosenName) : "All drinks"}</Text>
        {category && !searching ? <Button variant="link" label="See all" onPress={() => setCategory(null)} /> : null}
      </View>

      {error ? <Notice>{messageOf(error)}</Notice> : null}

      {loading && items.length === 0 ? (
        <View style={{ padding: spacing.xl }}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : items.length === 0 && !error ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Body muted>{query || category ? "Nothing matches. Try another word or kind of drink." : "Nothing is on the menu yet."}</Body>
          {query || category ? <Button variant="link" label="Clear the search" onPress={() => { setSearch(""); setCategory(null); }} /> : null}
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => {
            const price = priceOf(shop, item);
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${titleOf(shop, item)}${price !== null && priceField ? `, ${display(priceField, price)}` : ""}`}
                  onPress={() => router.push({ pathname: "/shop/[id]", params: { id: recordKey(shop.catalogue, item) } })}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <Picture file={pictureOf(shop, item)} size="fill" rendition="card" />
                  <View style={styles.cardText}>
                    <Text numberOfLines={2} style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>{titleOf(shop, item)}</Text>
                    {price !== null && priceField ? <Text style={{ color: colors.brand, fontSize: text.small, fontWeight: "700" }}>{display(priceField, price)}</Text> : null}
                  </View>
                </Pressable>
                {addButton(item)}
                <Heart id={item.id} title={titleOf(shop, item)} size={34} style={styles.heart} />
              </View>
            );
          })}
        </View>
      )}

      {page < pages ? (
        <Button variant="secondary" label="Show more" busy={more} disabled={more || loading} onPress={async () => { setMore(true); await load(page + 1, query, category); setMore(false); }} />
      ) : null}
    </Screen>
  );
}

/** The day's banners, one at a time, sliding on by themselves, with a dot for each. */
function Banners({ banners, width, onOpen }: { banners: ResourceRecord[]; width: number; onOpen: (banner: ResourceRecord) => void }) {
  const colors = useColors();
  const list = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [at, setAt] = useState(0);
  const touched = useRef(false);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      if (touched.current) return;
      setAt((now) => {
        const next = (now + 1) % banners.length;
        list.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, BANNER_MS);
    return () => clearInterval(timer);
  }, [banners.length, width]);

  const settled = (event: NativeSyntheticEvent<NativeScrollEvent>) => setAt(Math.round(event.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => (touched.current = true)}
        onMomentumScrollEnd={settled}
        style={{ width, borderRadius: radius.lg }}>
        {banners.map((banner) => {
          const file = pictureOfRecord(banner);
          return (
            <Pressable key={banner.id} accessibilityRole="button" accessibilityLabel={String(banner.title ?? "")} onPress={() => onOpen(banner)} style={[styles.banner, { width, backgroundColor: colors.fill }]}>
              {file ? <Image source={{ uri: file.url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
              <View style={[StyleSheet.absoluteFill, styles.shade]} />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>{String(banner.title ?? "")}</Text>
                {banner.subtitle ? <Text style={styles.bannerSubtitle}>{String(banner.subtitle)}</Text> : null}
                <View style={[styles.bannerButton, { backgroundColor: colors.brand }]}>
                  <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: text.small }}>Order now</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.onBrand} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, index) => (
            <View key={banner.id} style={[styles.dot, { width: index === at ? 22 : 8, backgroundColor: index === at ? colors.brand : colors.border }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderRadius: radius.full, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, minHeight: 44, fontSize: text.body },
  heading: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  banner: { height: 180, overflow: "hidden", justifyContent: "flex-end" },
  // Dark at the bottom, where the words are, so they read over any picture.
  shade: { backgroundColor: "rgba(0, 0, 0, 0.38)" },
  bannerText: { padding: spacing.lg, gap: 4 },
  bannerTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  bannerSubtitle: { color: "rgba(255, 255, 255, 0.88)", fontSize: text.small },
  bannerButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.full },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  tile: { alignItems: "center", gap: 6, width: 76 },
  tileRing: { borderWidth: 2, borderRadius: 40, padding: 2 },
  specials: { gap: spacing.md },
  specialsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  specialsIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  special: { width: 150, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  drinksHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  card: { width: "48%", borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: "hidden" },
  cardText: { padding: spacing.md, gap: 2 },
  heart: { position: "absolute", left: spacing.sm, top: spacing.sm },
  add: { position: "absolute", right: spacing.sm, top: spacing.sm, minWidth: 32, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
