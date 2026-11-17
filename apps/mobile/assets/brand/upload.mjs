// Puts the chosen photos into Juice Me through its API, as the admin: each is uploaded to the
// field it is for (so Laravel optimises it and makes its renditions), then saved on its record.
// Also makes the home's banners and marks today's specials.
//   node upload.mjs http://192.168.1.9:8000/api
import { readFileSync } from "node:fs";

const API = process.argv[2];
const DIR = "D:/nevela/.git/jm-brand/photos/full";
const credits = JSON.parse(readFileSync(`${DIR}/credits.json`, "utf8"));

const call = async (method, path, body, headers = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !(body instanceof Uint8Array) ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
};
let token = null;
token = (await call("POST", "/auth/token", { email: "admin@example.com", password: "password", device: "photo upload" })).token;

const all = async (slug) => (await call("GET", `/${slug}?perPage=100`)).data;
const upload = async (resource, file) =>
  (await call("PUT", `/_nevela/uploads/${resource}/image?name=${encodeURIComponent(file)}`, new Uint8Array(readFileSync(`${DIR}/${file}`)), { "Content-Type": "image/jpeg" })).key;

const beverages = await all("beverages");
const categories = await all("categories");
const byName = (list, name) => list.find((record) => record.name === name) ?? (() => { throw new Error(`no ${name}`); })();

for (const credit of credits.filter((c) => c.kind === "beverage")) {
  const drink = byName(beverages, credit.name);
  await call("PATCH", `/beverages/${drink.id}`, { image: await upload("Beverage", credit.file), updatedAt: drink.updatedAt });
  console.log("drink", credit.name);
}
for (const credit of credits.filter((c) => c.kind === "category")) {
  const category = byName(categories, credit.name);
  await call("PATCH", `/categories/${category.id}`, { image: await upload("Category", credit.file), updatedAt: category.updatedAt });
  console.log("category", credit.name);
}

// Today's specials: one of each kind, so the strip has some colour.
const specials = ["Passion Fruit Juice", "Mango Passion Smoothie", "Chocolate Shake", "Iced Coffee"];
for (const drink of await all("beverages")) {
  const featured = specials.includes(drink.name);
  if (Boolean(drink.featured) !== featured) await call("PATCH", `/beverages/${drink.id}`, { featured, updatedAt: drink.updatedAt });
}
console.log("specials", specials.join(", "));

// The banners at the top of the home, each opening its kind of drink.
const banners = [
  ["Fresh from the fruit", "Pressed this morning from Ugandan fruit", "Juices"],
  ["Smoothies, made to order", "Thick, cold and blended while you wait", "Smoothies"],
  ["Bugisu coffee, all day", "Mount Elgon arabica, hot or iced", "Coffee"],
];
const existing = await all("banners");
for (const [index, [title, subtitle, category]] of banners.entries()) {
  if (existing.some((banner) => banner.title === title)) continue;
  const credit = credits.find((c) => c.kind === "banner" && c.name === title);
  await call("POST", "/banners", { title, subtitle, image: await upload("Banner", credit.file), categoryId: byName(categories, category).id, active: true, position: index + 1 });
  console.log("banner", title);
}
