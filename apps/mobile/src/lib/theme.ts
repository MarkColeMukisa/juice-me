import { Appearance, useColorScheme } from "react-native";

import * as storage from "./storage";

/**
 * Juice Me's colours, flat and light: white screens (true black in the dark), grey fills
 * for what you type into or pick, hairlines between things instead of shadows, and one
 * colour, mango orange, kept for what matters: the main button, what is selected, links.
 * Change them here and every screen follows.
 */
const light = {
  /** Screens, headers, the tab bar. */
  background: "#FFFFFF",
  /** Cards and lists: the same white, set off by a hairline. */
  surface: "#FFFFFF",
  /** Grey fill: search boxes, fields, chips, steppers, pictures still loading. */
  fill: "#F2F4F5",
  /** Hairlines between rows and around cards. */
  border: "#E6E9EB",
  text: "#111B21",
  /** Sublines, labels, inactive tabs. */
  muted: "#5F6B73",
  /** Placeholders and fine print only. */
  faint: "#8696A0",
  /** The main button, the active tab, links. White on it reads at 5:1. */
  brand: "#C9410B",
  onBrand: "#FFFFFF",
  /** What is selected, unread or active, and the circles behind icons. */
  brandSoft: "#FFF1E8",
  danger: "#D93F3F",
  dangerSoft: "#FDECEC",
  success: "#1E8E4E",
  successSoft: "#E8F6EE",
  /** Older names for the same orange, kept so every screen speaks one colour. */
  accent: "#C9410B",
  accentSoft: "#FFF1E8",
  tabBar: "#FFFFFF",
  /** Behind a sheet or over a picture with words on it. */
  scrim: "rgba(17, 27, 33, 0.45)",
};

const dark: typeof light = {
  background: "#000000",
  surface: "#0B0B0B",
  fill: "#1A1A1A",
  border: "#262626",
  text: "#F5F5F5",
  muted: "#A3A3A3",
  faint: "#737373",
  // Brighter on black, with black words on it (8:1): orange marks things, never floods them.
  brand: "#FF7A1A",
  onBrand: "#000000",
  brandSoft: "#2A1407",
  danger: "#FF6B6B",
  dangerSoft: "#2B1111",
  success: "#4ADE80",
  successSoft: "#0F2A1A",
  accent: "#FF7A1A",
  accentSoft: "#2A1407",
  tabBar: "#000000",
  scrim: "rgba(0, 0, 0, 0.55)",
};

export type Colors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 12, lg: 14, xl: 20, full: 999 } as const;
export const text = { tiny: 11, caption: 12, small: 13, label: 14, body: 15, lead: 16, heading: 20, title: 28 } as const;

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
  // "unspecified" hands the decision back to the phone. A browser has no way to be told: the
  // web version follows the computer's own setting.
  if (typeof Appearance.setColorScheme === "function") Appearance.setColorScheme(choice === "system" ? "unspecified" : choice);
  if (choice === "system") await storage.removeItem(APPEARANCE_KEY).catch(() => undefined);
  else await storage.setItem(APPEARANCE_KEY, choice).catch(() => undefined);
}

/** The colours for the phone's current appearance. */
export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}
