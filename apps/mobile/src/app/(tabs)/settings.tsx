import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Heading, Row, Screen, Title, type IconName } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { iconFor } from "@/lib/icons";
import { useResources } from "@/lib/resources";
import { loadAppearance, radius, setAppearance, spacing, text, useColors, type AppearanceChoice } from "@/lib/theme";
import { loadInbox } from "../notifications";
import { CATALOGUE_SLUGS } from "./records";

/** The fourth tab: for staff, More (their account and everything that isn't the day's work); a customer reaches Settings from Account. */
export default function Settings() {
  const { shell } = useAuth();
  return shell === "customer" ? <SettingsScreen /> : <MoreScreen />;
}

interface Link {
  key: string;
  icon: IconName;
  label: string;
  detail: string | null;
  go: () => void;
}

/**
 * More: who you are, then everything kept off the other tabs: the records that aren't the
 * catalogue, people and roles, activity and the trash, security, appearance, and what the app
 * is (where a newer Nevela is mentioned: it is for whoever builds the app, not the shop).
 */
function MoreScreen() {
  const { user, can, signOut } = useAuth();
  const { resources } = useResources();
  const colors = useColors();
  const [leaving, setLeaving] = useState(false);
  const [appearance, setChosen] = useState<AppearanceChoice>("system");
  const [release, setRelease] = useState<string | null>(null);

  useEffect(() => {
    loadAppearance().then(setChosen);
    loadInbox()
      .then((inbox) => setRelease(inbox.conditions.find((condition) => condition.id === "release")?.title ?? null))
      .catch(() => undefined);
  }, []);

  if (!user) return null;
  const choose = (choice: AppearanceChoice) => {
    setChosen(choice);
    setAppearance(choice);
  };
  // What isn't on Home, Orders or Catalogue.
  const others = resources.filter((resource) => !CATALOGUE_SLUGS.includes(resource.slug) && resource.slug !== "orders");
  const mayDelete = user.isAdmin || user.permissions.some((key) => key.endsWith(".delete"));
  const manage: Link[] = [
    ...others.map((resource) => ({ key: resource.slug, icon: iconFor(resource.icon), label: resource.pluralLabel, detail: null, go: () => router.push({ pathname: "/r/[slug]", params: { slug: resource.slug } }) })),
    ...(can("users.view") ? [{ key: "people", icon: "people-outline" as IconName, label: "People", detail: "Who can sign in, and their roles", go: () => router.push("/access/users") }] : []),
    ...(can("roles.view") ? [{ key: "roles", icon: "shield-checkmark-outline" as IconName, label: "Roles and permissions", detail: "What each role may do", go: () => router.push("/access/roles") }] : []),
  ];
  const tracking: Link[] = [
    { key: "notifications", icon: "notifications-outline", label: "Notifications", detail: null, go: () => router.push("/notifications") },
    ...(can("activity.view") ? [{ key: "activity", icon: "time-outline" as IconName, label: "Activity", detail: "Who changed what, and when", go: () => router.push("/activity") }] : []),
    ...(mayDelete ? [{ key: "trash", icon: "trash-outline" as IconName, label: "Trash", detail: "Bring back what was deleted", go: () => router.push("/trash") }] : []),
  ];
  const list = (links: Link[]) => links.map((row, index) => <Row key={row.key} icon={row.icon} label={row.label} detail={row.detail} onPress={row.go} last={index === links.length - 1} />);

  return (
    <Screen inTabs>
      <Title>More</Title>

      <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={({ pressed }) => [styles.who, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
        {user.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.brandSoft }]}>
            <Text style={{ color: colors.brand, fontSize: text.heading, fontWeight: "700" }}>{(user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: text.lead, fontWeight: "700" }}>{user.name ?? "No name yet"}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: text.small }}>{user.email}</Text>
          {user.roles.length > 0 ? <Text style={{ color: colors.brand, fontSize: text.caption, fontWeight: "600" }}>{user.roles.map((role) => role.charAt(0) + role.slice(1).toLowerCase()).join(", ")}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>

      {manage.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Heading>Manage</Heading>
          <Card>{list(manage)}</Card>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Heading>Keeping track</Heading>
        <Card>{list(tracking)}</Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>Security</Heading>
        <Card>
          <Row icon="lock-closed-outline" label="Change password" onPress={() => router.push("/change-password")} />
          <Row icon="key-outline" label="Two-step sign-in" detail="Authenticator and codes, and removing passkeys" onPress={() => router.push("/security")} />
          <Row icon="phone-portrait-outline" label="Devices" detail="Where you are signed in, and signing one out" onPress={() => router.push("/devices")} last />
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>Appearance</Heading>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["system", "light", "dark"] as const).map((choice) => (
            <View key={choice} style={{ flex: 1 }}>
              <Button variant={appearance === choice ? "primary" : "secondary"} label={choice === "system" ? "Phone's" : choice === "light" ? "Light" : "Dark"} onPress={() => choose(choice)} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>About</Heading>
        <Card>
          <Row icon="server-outline" label="Server" detail={API_URL} />
          <Row icon="information-circle-outline" label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} last={!release} />
          {release ? <Row icon="sparkles-outline" label={release} detail="For whoever builds the app: php nevela upgrade" onPress={() => router.push("/notifications")} last /> : null}
        </Card>
      </View>

      <Button variant="danger" label="Sign out" icon="log-out-outline" busy={leaving} onPress={async () => { setLeaving(true); try { await signOut(); } finally { setLeaving(false); } }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});

/**
 * The settings themselves: a tab for staff, and for a customer a page opened from Account
 * (app/preferences.tsx), with a way back. A customer isn't shown which server the app uses.
 */
export function SettingsScreen({ inTabs = true }: { inTabs?: boolean }) {
  const { signOut, shell } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [appearance, setChosen] = useState<AppearanceChoice>("system");

  useEffect(() => {
    loadAppearance().then(setChosen);
  }, []);

  const choose = (choice: AppearanceChoice) => {
    setChosen(choice);
    setAppearance(choice);
  };

  return (
    <Screen inTabs={inTabs} edges={inTabs ? undefined : ["bottom"]}>
      {inTabs ? <Title>Settings</Title> : null}

      <View style={{ gap: spacing.sm }}>
        <Heading>Security</Heading>
        <Card>
          <Row icon="key-outline" label="Two-step sign-in" detail="Authenticator and codes, and removing passkeys" onPress={() => router.push("/security")} />
          <Row icon="phone-portrait-outline" label="Devices" detail="Where you are signed in, and signing one out" onPress={() => router.push("/devices")} last />
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>Appearance</Heading>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["system", "light", "dark"] as const).map((choice) => (
            <View key={choice} style={{ flex: 1 }}>
              <Button variant={appearance === choice ? "primary" : "secondary"} label={choice === "system" ? "Phone's" : choice === "light" ? "Light" : "Dark"} onPress={() => choose(choice)} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Heading>About</Heading>
        <Card>
          {shell !== "customer" ? <Row icon="server-outline" label="Server" detail={API_URL} /> : null}
          <Row icon="information-circle-outline" label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} last />
        </Card>
      </View>

      <Button variant="danger" label="Sign out" icon="log-out-outline" busy={leaving} onPress={async () => { setLeaving(true); try { await signOut(); } finally { setLeaving(false); } }} />
    </Screen>
  );
}
