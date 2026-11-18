import { router } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";

import { api } from "./api";
import { useAuth } from "./auth";
import { comeBackTo } from "./guest";

/**
 * The drinks the signed-in person likes, kept once for the whole app: every heart on every
 * screen reads the same list and lights up together. A tap shows at once and is put back if
 * Laravel refuses it. Someone not signed in is taken to sign in, and back to the drink.
 */

interface State {
  /** Whose likes these are: they are never shown to anyone else. */
  owner: string | null;
  /** Drink ids, the newest first. */
  liked: string[];
  loaded: boolean;
  failed: boolean;
  /** Drinks with a tap on its way to Laravel: a second tap waits for it. */
  busy: string[];
}

let state: State = { owner: null, liked: [], loaded: false, failed: false, busy: [] };
const listeners = new Set<() => void>();

function change(next: Partial<State>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadFor(owner: string): Promise<void> {
  change({ owner, liked: owner === state.owner ? state.liked : [], loaded: owner === state.owner && state.loaded, failed: false });
  try {
    const { data } = await api.get<{ data: string[] }>("/likes");
    if (state.owner === owner) change({ liked: data, loaded: true });
  } catch {
    if (state.owner === owner) change({ loaded: true, failed: true });
  }
}

async function flip(owner: string, id: string): Promise<void> {
  if (state.busy.includes(id)) return;
  const was = state.liked.includes(id);
  change({ busy: [...state.busy, id], liked: was ? state.liked.filter((one) => one !== id) : [id, ...state.liked] });
  try {
    if (was) await api.delete(`/likes/${encodeURIComponent(id)}`);
    else await api.put(`/likes/${encodeURIComponent(id)}`, {});
  } catch {
    // Not kept (no signal, or the drink is gone): the heart goes back to what it was.
    if (state.owner === owner) change({ liked: was ? [id, ...state.liked.filter((one) => one !== id)] : state.liked.filter((one) => one !== id) });
  } finally {
    change({ busy: state.busy.filter((one) => one !== id) });
  }
}

export function useLikes() {
  const { user } = useAuth();
  const me = user ? String(user.id) : null;
  const now = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (me === null) {
      if (state.owner !== null) change({ owner: null, liked: [], loaded: false, failed: false, busy: [] });
    } else if (state.owner !== me) {
      void loadFor(me);
    }
  }, [me]);

  // Until this person's own list is in, nothing is shown as liked.
  const liked = me !== null && now.owner === me ? now.liked : [];
  return {
    liked,
    loaded: me !== null && now.owner === me && now.loaded,
    failed: me !== null && now.owner === me && now.failed,
    isLiked: (id: string) => liked.includes(id),
    reload: () => (me ? loadFor(me) : Promise.resolve()),
    toggle: (id: string) => {
      if (me === null) {
        comeBackTo(`/shop/${encodeURIComponent(id)}`);
        router.push({ pathname: "/sign-in", params: { reason: "like" } });
        return;
      }
      void flip(me, id);
    },
  };
}
