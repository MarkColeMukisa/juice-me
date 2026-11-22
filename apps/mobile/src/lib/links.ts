import type { Href } from "expo-router";

/** The shop's orders, and whether whoever is signed in works there or buys there. */
export interface OrdersLink {
  slug: string;
  staff: boolean;
  customer: boolean;
}

/**
 * Where a dashboard address, from the bell or a push, opens in the app: one record, a whole
 * list ("5 new accounts" leads to the people), the trash, activity or the sign-in settings.
 * Null: the app has nowhere to take it.
 */
export function screenFor(url: string | null, orders: OrdersLink | null): Href | null {
  const [where = "", query = ""] = (url ?? "").split("#")[0].split("?");
  if (!/^\/dashboard(\/|$)/.test(where)) return null;
  const parts = where.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return null;
  const [first, second, third] = parts;

  if (first === "account") return "/security";
  if (first === "activity") return "/activity";
  if (first === "trash") {
    // Read by hand: URLSearchParams.get is missing in some React Native versions.
    const slug = /(?:^|&)in=([^&]+)/.exec(query)?.[1];
    return slug ? { pathname: "/trash/[slug]", params: { slug: decodeURIComponent(slug) } } : "/trash";
  }
  if (first === "access") {
    if (second === "roles") return third ? { pathname: "/access/roles/[id]", params: { id: third } } : "/access/roles";
    // Users, and deleted accounts, which the people screen holds too.
    return second === "users" && third ? { pathname: "/access/users/[id]", params: { id: third } } : "/access/users";
  }
  if (orders && first === orders.slug) {
    // A customer's own order opens on its Juice Me page; the shop's on the record screen.
    if (second) return orders.customer ? { pathname: "/order/[id]", params: { id: second } } : { pathname: "/r/[slug]/[id]", params: { slug: first, id: second } };
    return "/orders";
  }
  return second ? { pathname: "/r/[slug]/[id]", params: { slug: first, id: second } } : { pathname: "/r/[slug]", params: { slug: first } };
}
