import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { AlertBanner } from "@/components/alert-banner";
import type { Inbox } from "@/app/notifications";
import * as Notifications from "expo-notifications";

import { api } from "./api";
import { useAuth } from "./auth";
import { useShop } from "./cart";
import { screenFor } from "./links";
import { pushSupported, registerPush, urlOf } from "./push";

/** The push already acted on, so the one that opened the app isn't followed twice. */
let followed: string | null = null;

/** How often the bell is asked while the app is open. */
const EVERY_MS = 20000;

export type InboxItem = Inbox["items"][number];

interface Alerts {
  /** The bell as last read: null before the first answer, or signed out. */
  inbox: Inbox | null;
  unread: number;
  /** The unread notices about one order (by its id), or about any order when no id is given. */
  unreadAbout: (slug: string, id?: string) => InboxItem[];
  /** Read the bell now, after something was done that may have changed it. */
  refresh: () => Promise<void>;
  /** Mark notices read (seen on their order's page, or tapped). */
  markRead: (ids: string[]) => Promise<void>;
  /** Where a notice leads, in the app: an order's own page for a customer, else the record. */
  open: (item: InboxItem) => void;
}

const AlertsContext = createContext<Alerts | null>(null);

/** "/dashboard/orders/abc" → { slug: "orders", id: "abc" }. */
export function targetOf(url: string | null): { slug: string; id: string } | null {
  const match = /^\/dashboard\/([a-z0-9-]+)\/([^/?#]+)$/.exec(url ?? "");
  return match && match[1] !== "account" && match[1] !== "access" ? { slug: match[1], id: decodeURIComponent(match[2]) } : null;
}

/** What makes a notice new to this phone: a notice, or one grouped notice that has grown. */
const mark = (item: InboxItem) => `${item.id}|${item.count}|${item.at}`;

/**
 * Juice Me's alerts while the app is open: the bell is asked every 20 seconds (and straight
 * away when the app comes back to the front), and anything new slides down from the top with
 * a buzz: "Your order JM-0016 is now Ready". A tap opens the order.
 *
 * With the app closed, a push notification says the same (lib/push.ts): tapping it opens the
 * order, and one arriving while the app is open brings the bell up to date at once.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user, shell } = useAuth();
  const shop = useShop();
  const me = user ? String(user.id) : null;
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [showing, setShowing] = useState<{ item: InboxItem; more: number } | null>(null);
  // What this phone has already seen, for this person: only what comes after is announced.
  const seen = useRef<{ owner: string | null; marks: Set<string> | null }>({ owner: null, marks: null });
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (me === null || busy.current) return;
    busy.current = true;
    try {
      const answer = await api.get<Inbox>("/_nevela/notifications");
      if (seen.current.owner !== me) return;
      setInbox(answer);
      const marks = new Set(answer.items.map(mark));
      const before = seen.current.marks;
      seen.current.marks = marks;
      // The first answer is what was already there: nothing to announce.
      if (before === null) return;
      const fresh = answer.items.filter((item) => !item.read && !before.has(mark(item)));
      if (fresh.length === 0) return;
      setShowing({ item: fresh[0], more: fresh.length - 1 });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch {
      // No signal, or signed out meanwhile: the next turn tries again.
    } finally {
      busy.current = false;
    }
  }, [me]);

  // Someone else signed in: nothing of the last person's bell is kept or announced.
  useEffect(() => {
    seen.current = { owner: me, marks: null };
    setInbox(null);
    setShowing(null);
    if (me === null) return;
    void load();
    let timer: ReturnType<typeof setInterval> | null = setInterval(load, EVERY_MS);
    const listening = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void load();
        if (timer === null) timer = setInterval(load, EVERY_MS);
      } else if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer !== null) clearInterval(timer);
      listening.remove();
    };
  }, [me, load]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      // Shown read at once; Laravel is told one by one.
      setInbox((current) => (current ? { ...current, unread: Math.max(0, current.unread - ids.length), items: current.items.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)) } : current));
      await Promise.all(ids.map((id) => api.post("/_nevela/notifications/read", { id }).catch(() => undefined)));
    },
    [],
  );

  /** Where a link from the bell or a push leads, in the app: a record, a list, or else the bell itself. */
  const ordersSlug = shop?.orders.slug ?? null;
  const go = useCallback(
    (url: string | null) => {
      const orders = ordersSlug ? { slug: ordersSlug, staff: shell !== "customer", customer: shell === "customer" } : null;
      router.push(screenFor(url, orders) ?? "/notifications");
    },
    [shell, ordersSlug],
  );

  const value = useMemo<Alerts>(() => {
    const unreadAbout = (slug: string, id?: string) =>
      (inbox?.items ?? []).filter((item) => {
        if (item.read) return false;
        const target = targetOf(item.url);
        return target !== null && target.slug === slug && (id === undefined || target.id === id);
      });
    const open = (item: InboxItem) => {
      void markRead([item.id]);
      go(item.url);
    };
    return { inbox, unread: inbox?.unread ?? 0, unreadAbout, refresh: load, markRead, open };
  }, [inbox, load, markRead, go]);

  // Pushes: this phone is registered for whoever signs in, a tap opens what it is about, and
  // one arriving with the app open is announced straight away instead of at the next ask.
  useEffect(() => {
    if (!pushSupported) return;
    if (me === null) {
      // Signed out for being away, the phone still gets its alerts. A tap asks to sign in
      // first; the tap isn't marked followed, so once signed in, it opens what it was about.
      const tapped = Notifications.addNotificationResponseReceivedListener(() => router.navigate("/sign-in"));
      return () => tapped.remove();
    }
    void registerPush();
    const follow = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.identifier ?? null;
      if (response == null || id === followed) return;
      followed = id;
      go(urlOf(response));
    };
    void Notifications.getLastNotificationResponseAsync().then(follow).catch(() => undefined);
    const tapped = Notifications.addNotificationResponseReceivedListener(follow);
    const arrived = Notifications.addNotificationReceivedListener(() => void load());
    return () => {
      tapped.remove();
      arrived.remove();
    };
  }, [me, go, load]);

  return (
    <AlertsContext value={value}>
      {children}
      {showing ? (
        <AlertBanner
          key={mark(showing.item)}
          title={showing.item.title}
          body={showing.more > 0 ? `${showing.item.body ? `${showing.item.body} · ` : ""}and ${showing.more} more` : showing.item.body}
          onOpen={() => {
            const item = showing.item;
            setShowing(null);
            value.open(item);
          }}
          onClose={() => setShowing(null)}
        />
      ) : null}
    </AlertsContext>
  );
}

export function useAlerts(): Alerts {
  const alerts = use(AlertsContext);
  if (!alerts) throw new Error("useAlerts needs AlertsProvider (app/_layout.tsx).");
  return alerts;
}
