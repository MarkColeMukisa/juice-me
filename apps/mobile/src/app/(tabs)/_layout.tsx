import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/ui";
import { useAlerts } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useCanTrack, useCart, useCatalogue, useShop } from "@/lib/cart";
import { useColors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * A flat bar along the bottom with a hairline above it. The active tab's icon sits in a soft
 * orange pill; the others are grey.
 */
export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Customers have no Records tab: that is how staff work with the data. What they may see is on their home.
  const { shell, user } = useAuth();
  // Where there is a shop to buy from, a customer's tabs are the shop's.
  const shop = useShop();
  const buying = shell === "customer" && shop !== null;
  // Someone browsing before signing in has the shop and the way to an account: nothing else.
  const catalogue = useCatalogue();
  const guest = user === null && catalogue !== null;
  const tracking = useCanTrack(shop);
  const cart = useCart();
  // News about their orders not yet seen: a badge on Orders.
  const orderNews = useAlerts().unreadAbout("orders").length;
  // Staff: Home, Orders, Catalogue and More. Their account is a page under More.
  const staff = user !== null && shell !== "customer";
  const staffOrders = staff && shop !== null;
  const icon = (name: IconName, active: IconName) => ({ focused }: { focused: boolean }) => (
    <View style={[styles.pill, focused && { backgroundColor: colors.brandSoft }]}>
      <Ionicons name={focused ? active : name} color={focused ? colors.brand : colors.muted} size={22} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.onBrand, fontSize: 10, fontWeight: "700", borderWidth: 1.5, borderColor: colors.tabBar },
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.tabBar,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: buying || guest ? "Shop" : "Home", tabBarIcon: icon(buying || guest ? "storefront-outline" : "home-outline", buying || guest ? "storefront" : "home") }} />
      <Tabs.Screen name="orders" options={{ title: "Orders", href: (buying && tracking) || staffOrders ? undefined : null, tabBarBadge: buying && orderNews > 0 ? orderNews : undefined, tabBarIcon: icon(staff ? "bag-handle-outline" : "receipt-outline", staff ? "bag-handle" : "receipt") }} />
      <Tabs.Screen name="records" options={{ title: "Catalogue", href: staff ? undefined : null, tabBarIcon: icon("grid-outline", "grid") }} />
      <Tabs.Screen name="likes" options={{ title: "Likes", href: buying ? undefined : null, tabBarIcon: icon("heart-outline", "heart") }} />
      <Tabs.Screen name="cart" options={{ title: "Cart", href: buying ? undefined : null, tabBarBadge: cart.count > 0 ? cart.count : undefined, tabBarIcon: icon("cart-outline", "cart") }} />
      <Tabs.Screen name="account" options={{ title: "Account", href: staff ? null : undefined, tabBarIcon: icon("person-outline", "person") }} />
      <Tabs.Screen name="settings" options={{ title: "More", href: staff ? undefined : null, tabBarIcon: icon("ellipsis-horizontal-circle-outline", "ellipsis-horizontal-circle") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 60, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
