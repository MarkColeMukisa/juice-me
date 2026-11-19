import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api";

/**
 * Push notifications: what reaches the phone while the app is closed ("Your order JM-0016 is
 * now Ready", or for the shop, "New order JM-0017").
 *
 * When someone signs in, this phone's Expo push token is given to Laravel (PUT /push-tokens);
 * when they sign out, it is taken back first, while the sign-in still works, so the next
 * person on this phone doesn't get their pushes. The web version has no pushes: it keeps
 * asking the bell while it is open.
 */

export const pushSupported = Platform.OS !== "web";

/** The token registered for whoever is signed in now, if any. */
let registered: string | null = null;

if (pushSupported) {
  // With the app open, the alert slides down inside the app (AlertsProvider), so the
  // system's own banner would only say it twice.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Ask for permission (once), and tell Laravel where to reach this phone. Never throws. */
export async function registerPush(): Promise<void> {
  if (!pushSupported || !Device.isDevice) return;
  try {
    // Android needs the channel before it asks for permission (Android 13 and later).
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Orders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.put("/push-tokens", { token, platform: Platform.OS });
    registered = token;
  } catch {
    // No Firebase set up in this build, Expo Go, or no signal: the bell still works.
  }
}

/** Stop this phone's pushes for whoever is signed in. Call it before the sign-in ends. */
export async function forgetPush(): Promise<void> {
  const token = registered;
  registered = null;
  if (token === null) return;
  try {
    await api.delete(`/push-tokens/${encodeURIComponent(token)}`);
  } catch {
    // Offline: Laravel hands the phone to the next person who signs in on it anyway.
  }
}

/** Where a push leads, as the bell's links say it: "/dashboard/orders/abc". */
export function urlOf(response: Notifications.NotificationResponse | null | undefined): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === "string" ? url : null;
}
