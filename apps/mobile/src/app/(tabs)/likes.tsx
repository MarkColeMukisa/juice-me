import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Heart } from "@/components/heart";
import { Picture } from "@/components/pictures";
import { Body, Button, Loading, Notice, Screen, Title } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useCart, useShop } from "@/lib/cart";
import { display } from "@/lib/format";
import { useLikes } from "@/lib/likes";
import type { ResourceRecord } from "@/lib/resources";
import { cartItemOf, isAvailable, pictureOf, priceOf, titleOf } from "@/lib/shop-item";
import { radius, spacing, text, useColors } from "@/lib/theme";

/** The drinks this person likes, newest first: to open, put in the cart, or let go of. */
export default function Likes() {
  const shop = useShop();
  const likes = useLikes();
  const cart = useCart();
  const colors = useColors();
  // Each liked drink as the menu has it now: a price that moved, or a drink taken off.
  const [drinks, setDrinks] = useState<Record<string, ResourceRecord | null>>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchMissing = useCallback(
    async (ids: string[], again = false) => {
      if (!shop) return;
      const wanted = again ? ids : ids.filter((id) => !(id in drinks));
      if (wanted.length === 0) return;
      const found = await Promise.all(
        wanted.map(async (id) => {
          try {
            return [id, await api.get<ResourceRecord>(`/${shop.catalogue.slug}/${encodeURIComponent(id)}`)] as const;
          } catch (caught) {
            // Gone from the menu: shown as such. No signal: left to try again.
            return caught instanceof ApiError && caught.status === 404 ? ([id, null] as const) : null;
          }
        }),
      );
      setDrinks((current) => ({ ...current, ...Object.fromEntries(found.filter((pair) => pair !== null)) }));
    },
    [shop, drinks],
  );

  useEffect(() => {
    void fetchMissing(likes.liked);
  }, [likes.liked, fetchMissing]);

  // Back on the tab: liked somewhere else meanwhile, or a price changed.
  const { reload } = likes;
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await likes.reload();
    await fetchMissing(likes.liked, true);
    setRefreshing(false);
  };

  if (!shop) return <Screen inTabs><Title>Likes</Title><Body muted>There is nothing to order in this app.</Body></Screen>;
  if (!likes.loaded) return <Loading />;

  const priceField = shop.price ? shop.catalogue.fields[shop.price] : null;
  const shown = likes.liked.filter((id) => drinks[id] !== undefined);

  return (
    <Screen inTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Title>Likes</Title>
      {likes.failed ? <Notice>Couldn't load your likes. Pull down to try again.</Notice> : null}

      {likes.liked.length === 0 && !likes.failed ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="heart-outline" size={30} color={colors.brand} />
          <Text style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>Nothing liked yet</Text>
          <Body muted small>Tap the heart on a drink to keep it here for next time.</Body>
          <Button label="Browse drinks" onPress={() => router.navigate("/")} />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {shown.map((id) => {
            const item = drinks[id];
            if (!item) {
              return (
                <View key={id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <View style={{ flex: 1 }}>
                    <Body muted>This drink is no longer on the menu.</Body>
                  </View>
                  <Heart id={id} title="this drink" />
                </View>
              );
            }
            const price = priceOf(shop, item);
            const available = isAvailable(shop, item);
            const inCart = cart.lines.find((line) => line.id === id)?.quantity ?? 0;
            return (
              <View key={id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/shop/[id]", params: { id } })} style={({ pressed }) => [styles.open, pressed && { opacity: 0.7 }]}>
                  <Picture file={pictureOf(shop, item)} size={72} rendition="thumb" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2} style={{ color: colors.text, fontSize: text.body, fontWeight: "600" }}>{titleOf(shop, item)}</Text>
                    {price !== null && priceField ? <Text style={{ color: colors.brand, fontSize: text.small, fontWeight: "700" }}>{display(priceField, price)}</Text> : null}
                    {!available ? <Text style={{ color: colors.muted, fontSize: text.small }}>Not available right now</Text> : null}
                  </View>
                </Pressable>
                <View style={{ alignItems: "center", gap: spacing.sm }}>
                  <Heart id={id} title={titleOf(shop, item)} />
                  {available ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${titleOf(shop, item)} to the cart`}
                      hitSlop={6}
                      onPress={() => cart.add(cartItemOf(shop, item))}
                      style={[styles.add, { backgroundColor: colors.brand }]}>
                      {inCart > 0 ? <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: text.small }}>{inCart}</Text> : <Ionicons name="add" size={20} color={colors.onBrand} />}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
          {shown.length < likes.liked.length ? <ActivityIndicator color={colors.muted} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, alignItems: "center" },
  row: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  add: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
