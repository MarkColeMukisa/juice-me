import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json, plus what depends on where a build's API is.
 *
 * A build pointed at plain http:// (the "local-api" build in eas.json, which talks to
 * `nevela dev` on this computer) may use plain http. Android refuses it in release builds
 * otherwise. Builds for a real server use https and keep that refusal.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const plainHttp = (process.env.EXPO_PUBLIC_API_URL ?? "").startsWith("http://");
  return {
    ...config,
    name: config.name ?? "Juice Me",
    slug: config.slug ?? "juice-me",
    plugins: [...(config.plugins ?? []), ["expo-build-properties", { android: { usesCleartextTraffic: plainHttp } }]],
  };
};
