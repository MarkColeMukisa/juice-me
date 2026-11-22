import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { IdleWatch } from "@/components/idle-watch";
import { Intro } from "@/components/intro";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AlertsProvider } from "@/lib/alerts";
import { CartProvider, useCatalogue } from "@/lib/cart";
import { forgetComeBack, takeComeBack } from "@/lib/guest";
import { peekSignOutReason } from "@/lib/idle-clock";
import { ResourcesProvider, useResources } from "@/lib/resources";
import { loadAppearance, setAppearance, useColors } from "@/lib/theme";

// The splash screen stays up until the stored sign-in has been checked, so the app opens
// on the right screen rather than flashing the sign-in form at someone who is signed in.
SplashScreen.preventAutoHideAsync();

// The appearance chosen in Settings, applied before the first screen is drawn.
loadAppearance().then((choice) => {
  if (choice !== "system") setAppearance(choice);
});

// The opening animation plays once each time the app starts, not on every return to it.
let introPlayed = false;

export default function RootLayout() {
  return (
    <AuthProvider>
      <ResourcesProvider>
        <CartProvider>
          <AlertsProvider>
            <Screens />
          </AlertsProvider>
        </CartProvider>
      </ResourcesProvider>
    </AuthProvider>
  );
}

function Screens() {
  const { user, loading } = useAuth();
  const { loading: describing } = useResources();
  const colors = useColors();
  const dark = useColorScheme() === "dark";
  const [intro, setIntro] = useState(!introPlayed);
  // Someone not signed in browses the shop, when Laravel says anyone may read what it sells.
  const catalogue = useCatalogue();
  const browsing = user === null && catalogue !== null;
  // Until it is known whether there is a shop to browse, the splash stays: else the sign-in
  // form would flash before the shop.
  const waiting = loading || (user === null && describing);
  // Waiting holds the screens back only when the app opens. Once they are up they stay up:
  // signing out also asks again whether there is a shop to browse, and taking every screen
  // away for that moment left React Navigation with a REMOVE_ROUTES no navigator handled.
  const [started, setStarted] = useState(false);
  if (!waiting && !started) setStarted(true);

  useEffect(() => {
    if (!waiting) SplashScreen.hideAsync();
  }, [waiting]);

  // Left the way in without signing in (Back, a gesture, Keep browsing): where they were
  // going is forgotten, so signing in later from Account doesn't open an old product.
  const pathname = usePathname();
  useEffect(() => {
    if (user === null && !/^\/(sign-in|sign-up|oauth)/.test(pathname)) forgetComeBack();
  }, [user, pathname]);

  // Signed in from the shop (by password, a code, Google or a new account): back to what
  // they were adding, once the screens for someone signed in are there to go to.
  useEffect(() => {
    if (user === null || waiting) return;
    const path = takeComeBack();
    if (!path) return;
    const timer = setTimeout(() => router.push(path as never), 150);
    return () => clearTimeout(timer);
  }, [user, waiting]);

  // Signed out for being away (just now, or found so as the app opened): to the sign-in
  // screen, which says why, rather than left on the shop as a guest.
  useEffect(() => {
    if (user !== null || waiting || peekSignOutReason() === null) return;
    const timer = setTimeout(() => router.navigate("/sign-in"), 150);
    return () => clearTimeout(timer);
  }, [user, waiting]);

  if (waiting && !started) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text, border: colors.border, primary: colors.brand } };

  return (
    <ThemeProvider value={theme}>
      <IdleWatch>
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
          {/* The shop, for someone signed in, and for anyone at all when what it sells is public. */}
          {/* While it is being asked whether there is a shop to browse (just signed out), the
              shop's screens stay, so the shop isn't taken away and put back a moment later. */}
          <Stack.Protected guard={user !== null || browsing || (user === null && describing)}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="shop/[id]" options={{ title: "" }} />
          </Stack.Protected>
          {/* Signed in: the app. Signed out: only the sign-in screens, so no link can reach past them. */}
          <Stack.Protected guard={user !== null}>
            <Stack.Screen name="profile" options={{ title: "Account" }} />
            <Stack.Screen name="devices" options={{ title: "Devices" }} />
            <Stack.Screen name="change-password" options={{ title: "Change password" }} />
            <Stack.Screen name="security" options={{ title: "Sign-in security" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="activity" options={{ title: "Activity" }} />
            <Stack.Screen name="trash/index" options={{ title: "Trash" }} />
            <Stack.Screen name="trash/[slug]" options={{ title: "Trash" }} />
            <Stack.Screen name="access/users/index" options={{ title: "People" }} />
            <Stack.Screen name="access/users/[id]" options={{ title: "" }} />
            <Stack.Screen name="access/roles/index" options={{ title: "Roles and permissions" }} />
            <Stack.Screen name="access/roles/[id]" options={{ title: "" }} />
            <Stack.Screen name="shop/checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="shop/placed" options={{ headerShown: false }} />
            <Stack.Screen name="order/[id]" options={{ title: "" }} />
            <Stack.Screen name="preferences" options={{ title: "Settings" }} />
            {/* One set of screens for every resource. Each sets its own title once it knows which. */}
            <Stack.Screen name="r/[slug]/index" options={{ title: "" }} />
            <Stack.Screen name="r/[slug]/new" options={{ title: "" }} />
            <Stack.Screen name="r/[slug]/[id]/index" options={{ title: "" }} />
            <Stack.Screen name="r/[slug]/[id]/edit" options={{ title: "" }} />
          </Stack.Protected>
          <Stack.Protected guard={user === null}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        {intro ? (
          <Intro
            onDone={() => {
              introPlayed = true;
              setIntro(false);
            }}
          />
        ) : null}
      </IdleWatch>
    </ThemeProvider>
  );
}
