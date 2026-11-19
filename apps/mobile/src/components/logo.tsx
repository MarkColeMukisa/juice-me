import { Image } from "expo-image";

/** The Juice Me glass, as on the app's icon and splash screen. */
export function Logo({ size = 72 }: { size?: number }) {
  return <Image source={require("../../assets/images/splash-icon.png")} style={{ width: size, height: size}} contentFit="contain" accessibilityLabel="Juice Me" />;
}
