import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Body, Card, Heading, Loading, Notice, Row, Screen, Title } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { iconFor } from "@/lib/icons";
import { may, useResources, type Resource } from "@/lib/resources";
import { radius, spacing, text, useColors } from "@/lib/theme";
import { useLoaded } from "@/lib/use-loaded";

/** What customers see in the app, in the order the shop thinks of it. */
export const CATALOGUE_SLUGS = ["beverages", "categories", "banners"];

const BLURBS: Record<string, string> = {
  beverages: "The drinks on the menu, their prices and pictures",
  categories: "The kinds of drink the menu is sorted into",
  banners: "The slides at the top of the shop",
};

/**
 * Catalogue: the drinks, their kinds and the shop's banners, each with how many there are and
 * a way to add one. Anything else (posts, order lines, people) is under More. An app without
 * those resources lists every resource here instead.
 */
export default function Catalogue() {
  const { resources, loading, error, reload } = useResources();
  const { user } = useAuth();
  const colors = useColors();
  const chosen = CATALOGUE_SLUGS.map((slug) => resources.find((resource) => resource.slug === slug)).filter((resource): resource is Resource => resource !== undefined);
  const shown = chosen.length > 0 ? chosen : resources;
  const key = shown.map((resource) => resource.slug).join(",");

  const counts = useLoaded(
    useCallback(async () => {
      const pairs = await Promise.all(
        key.split(",").filter(Boolean).map(async (slug) => [slug, await api.get<{ total: number }>(`/${slug}/_stats`).then((stats) => stats.total).catch(() => null)] as const),
      );
      return Object.fromEntries(pairs) as Record<string, number | null>;
    }, [key]),
  );

  if (loading && resources.length === 0) return <Loading />;

  return (
    <Screen
      inTabs
      refreshControl={<RefreshControl refreshing={counts.refreshing} onRefresh={async () => { await reload(); counts.refresh(); }} />}>
      <View style={{ gap: 4 }}>
        <Title>Catalogue</Title>
        <Body muted>{chosen.length > 0 ? "What customers see: the drinks, their kinds and the banners." : "Everything you may see."}</Body>
      </View>
      {error ? <Notice>{messageOf(error)}</Notice> : null}
      {shown.length === 0 && !error ? <Body muted>Nothing here yet.</Body> : null}

      {chosen.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          {chosen.map((resource) => {
            const count = counts.data?.[resource.slug];
            return (
              <View key={resource.slug} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: resource.slug } })} style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.7 }]}>
                  <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}>
                    <Ionicons name={iconFor(resource.icon)} size={22} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
                      <Text style={{ color: colors.text, fontSize: text.lead, fontWeight: "700" }}>{resource.pluralLabel}</Text>
                      {count != null ? <Text style={{ color: colors.muted, fontSize: text.small, fontWeight: "600" }}>{count}</Text> : null}
                    </View>
                    <Text numberOfLines={2} style={{ color: colors.muted, fontSize: text.small, lineHeight: 18 }}>{BLURBS[resource.slug] ?? ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
                {user && may(user, resource, "create") ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add a ${resource.label.toLowerCase()}`}
                    onPress={() => router.push({ pathname: "/r/[slug]/new", params: { slug: resource.slug } })}
                    style={({ pressed }) => [styles.add, { borderTopColor: colors.border }, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="add" size={18} color={colors.brand} />
                    <Text style={{ color: colors.brand, fontSize: text.label, fontWeight: "600" }}>Add {resource.label.toLowerCase()}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Heading>Records</Heading>
          <Card>
            {shown.map((resource, index) => (
              <Row key={resource.slug} icon={iconFor(resource.icon)} label={resource.pluralLabel} onPress={() => router.push({ pathname: "/r/[slug]", params: { slug: resource.slug } })} last={index === shown.length - 1} />
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: "hidden" },
  cardMain: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
