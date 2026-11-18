import { SettingsScreen } from "./(tabs)/settings";

/** A customer's settings, opened from Account: the same as staff's Settings tab, with a back arrow. */
export default function Preferences() {
  return <SettingsScreen inTabs={false} />;
}
