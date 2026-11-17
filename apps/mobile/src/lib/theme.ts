import { Appearance, useColorScheme } from "react-native";

import * as storage from "./storage";

/**
 * Juice Me's colours: mango orange for what you press, passion-fruit purple as the accent,
 * dark roast brown for text, on a warm cream. The dark version is the same fruit at night.
 * Change them here and every screen follows.
 */
const light = {
  background: "#FFFBF4",
  surface: "#FFF4E0",
  border: "#F1E2C6",
  text: "#3B1F0E",
  muted: "#8A6A55",
  /** Buttons and the active tab. */
  brand: "#D9480F",
  onBrand: "#ffffff",
  danger: "#C92A2A",
  success: "#2F9E44",
  /** Charts, the icons on cards, the active tab: the one colour among the creams. */
  accent: "#7B2D8E",
  accentSoft: "#F3E8F7",
  tabBar: "#ffffff",
};

const dark: typeof light = {
  background: "#1F1208",
  surface: "#2B1B0F",
  border: "#3D2A1B",
  text: "#FFF4E0",
  muted: "#C9A98F",
  brand: "#FF9F1C",
  onBrand: "#1F1208",
  danger: "#FF6B6B",
  success: "#51CF66",
  accent: "#D49BE3",
  accentSoft: "#3A1F44",
  tabBar: "#2B1B0F",
};

export type Colors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
export const text = { small: 13, body: 16, heading: 20, title: 28 } as const;

/** How the app looks: as the phone does, or always one way. */
export type AppearanceChoice = "system" | "light" | "dark";

const APPEARANCE_KEY = "nevela.appearance";

/** The choice made in Settings, or "system" when none was. */
export async function loadAppearance(): Promise<AppearanceChoice> {
  const kept = await storage.getItem(APPEARANCE_KEY).catch(() => null);
  return kept === "light" || kept === "dark" ? kept : "system";
}

/** Apply a choice now and keep it for the next launch. Every screen follows, since each reads the colour scheme. */
export async function setAppearance(choice: AppearanceChoice): Promise<void> {
  // "unspecified" hands the decision back to the phone.
  Appearance.setColorScheme(choice === "system" ? "unspecified" : choice);
  if (choice === "system") await storage.removeItem(APPEARANCE_KEY).catch(() => undefined);
  else await storage.setItem(APPEARANCE_KEY, choice).catch(() => undefined);
}

/** The colours for the phone's current appearance. */
export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}
