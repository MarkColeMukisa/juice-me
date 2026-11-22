# Nevela mobile blueprint: what a new app should get on day one

This is what Juice Me needed beyond Nevela's scaffold to become a shippable product. Juice Me is a juice bar's ordering app: a Laravel 13 API, an Expo SDK 58 mobile app, and a Next.js dashboard. Each section has four parts:
- what to build;
- why it matters;
- the working code in this repo (`MarkColeMukisa/juice-me`) to copy from;
- the traps we hit.

Paths are relative to the repo root.

The goal is for `nevela new` (or `nevela mobile`) to produce all of this already wired. The developer then fills in their resources and branding. They shouldn't have to discover each piece in production, one at a time.

---

## 1. Two shells: staff and customer

**What.** A signed-in person sees one of two apps, decided by role (`lib/shell.ts`):

- **Customer shell.** Tabs: Shop, Likes, Cart, Orders, Account. A guest (signed out) browses the shop and is sent to sign in only when they add to the cart or like something. They come back to what they were doing afterwards (`lib/guest.ts`, `takeComeBack`).
- **Staff shell.** Four tabs only: **Home, Orders, Catalogue, More**.
  - Home is the business at a glance.
  - Orders is the work.
  - Catalogue is what customers see.
  - More holds everything else: account, other records, people and roles, activity, trash, security, appearance and sign out.

The generic "Records" list is not a staff tab. Business owners don't think in "resources".

**Roles.** Ship exactly two by default: `ADMIN`, who runs the shop, and `CUSTOMER`, who buys. Sign-up gives `CUSTOMER` (`NEVELA_DEFAULT_ROLE=CUSTOMER`).
- The customer grants are view on the catalogue resources, plus `orders.view`, `orders.create` and `orders.cancel`.
- Orders are `owner: email`, so a customer sees only their own and staff (`orders.edit`) see all.
- Migration: `apps/api/database/migrations/2026_11_19_000000_two_roles_admin_and_customer.php`.

**Code:**
- `apps/mobile/src/app/(tabs)/_layout.tsx` (which tabs each shell gets);
- `components/staff-home.tsx`;
- `components/customer-home.tsx`, `components/juice-home.tsx`;
- `app/(tabs)/records.tsx` (Catalogue);
- `app/(tabs)/settings.tsx` (More for staff, Settings for customers);
- `app/profile.tsx` (staff account page, opened from More and the header avatar).

## 2. The staff home: business first

The order of sections matters, so build it in this order:

1. **Header:** logo, app name, "Admin dashboard", a bell with an unread badge, and the avatar, which leads to the profile.
2. **Greeting:** "Good afternoon, Mark 👋 / Here's what's happening today."
3. **Business notices:** one small dismissible row that leads to Notifications. Dismissals are remembered per notice id, so a new notice still shows.
   - **Never show the "Nevela x.y.z is out" release notice here.** The shop owner can't act on it. Show it under More → About, labelled "For whoever builds the app".
4. **Today's orders hero card:**
   - the count since midnight *in the shop's time zone*;
   - a comparison with the same time on the same day last week, not a whole day against a morning;
   - a "N pending" pill.
5. **Quick actions:** four tiles (Add beverage, New banner, Add category, View orders). The first is the primary orange tile; the rest are outlined.
6. **Overview:** a 2×2 grid of compact stat cards with counts and a "N new" or "Stable" pill, plus **Total sales** with a week-on-week % pill. No sparklines.
7. **Recent activity:** the latest orders, each with a status-colored icon, customer, drink count, total, status pill and time ago.

**API it needs:** `GET /api/shop-figures` (staff only) returns:

```json
{ "today": { "orders": 5, "sameTimeLastWeek": 4 }, "pending": 2,
  "sales": { "total": 128400, "week": 41000, "lastWeek": 36000 }, "currency": "UGX" }
```

- "Today" is calculated in `Africa/Kampala`, which should be configurable. Each boundary is converted to UTC before querying.
- Sales exclude cancelled orders.
- Code: `apps/api/app/Http/Controllers/ShopFiguresController.php`, tested in `tests/Feature/ShopFiguresTest.php`.
- **Nevela should generate this for any app with an orders resource** that has a money total and a status enum.

## 3. Orders as cards, with status filters

**What.** One screen serves both shells: "My orders" for customers and "Orders" for staff.
- Filter chips: **Active (n)**, **Completed**, **Cancelled**.
- Each card shows:
  - the order number;
  - who ordered and when (staff only);
  - a status pill;
  - the first drink's thumbnail and name;
  - "N items · other drinks";
  - the total.
- Tapping a card opens `/order/[id]` for a customer and the record with its actions for staff.

**Status colors** (`statusTone` in `components/orders-screen.tsx`):

| Status | Color |
|---|---|
| pending | orange (it needs the shop) |
| accepted, preparing | blue |
| ready, completed | green |
| cancelled | red |

**Requirements in the framework:**
- **List endpoints should carry line items.** We added `protected $with = ['orderItems']` to the `Order` model, because the controller's `index` sits inside a `nevela:generated` block and editing inside it blocks regeneration.
  - Generate this, or support `?include=items` on lists.
- **Lists can filter on one value per field only.** "Active" needs four statuses, so we make four requests and merge them.
  - Nevela should accept `filter[status]=pending,accepted,preparing,ready`, meaning *in*.
- Chip counts come from `/_stats?field=status` values, not from the loaded page.
- The menu is fetched once (`perPage=100`) and kept in a module cache, so cards can show drink pictures without a request per order.

## 4. Email that actually arrives

**What we learned:**
- **Sevalla blocks outgoing SMTP.** Gmail on ports 587 and 465 was cut off. Production mail goes through **Brevo's HTTPS API** instead:
  - `symfony/brevo-mailer`;
  - the transport is registered in `AppServiceProvider` with `Mail::extend('brevo', …)`;
  - `MAIL_MAILER=brevo` and `BREVO_API_KEY`.
- **Send from a domain authenticated in Brevo**, with DKIM, a `brevo-code` record and DMARC. Never send from `@gmail.com`: a third party can't DKIM-sign Gmail, so mail lands in spam. Juice Me sends as `Juice Me <juiceme@markcole.dev>`.
  - Add a DMARC record (`v=DMARC1; p=none; rua=…`) even if you use nothing else. Gmail and Yahoo expect one.
- A mailbox host like Spacemail can't be the sending path from Sevalla (it's SMTP only). Keep it as the inbox, which receives replies, and let Brevo send.

**Nevela should:**
- ship a Brevo (or any HTTPS API) mailer option in the installer;
- check sending in `nevela deploy:check`.

## 5. Email verification on, and admins told about real customers only

**What.** Turn `nevela.auth.require_email_verification` on by default for apps with public sign-up. Otherwise anyone can register `kkk@gmail.com`.
- Register returns `{verify: true}` with no token.
- `POST /auth/email/verify` with the 6-digit code signs the person in.
- A password sign-in before verifying returns `403 EMAIL_NOT_VERIFIED`, emails a fresh code, and the app switches to the code step on the spot (`app/sign-in.tsx`, `way === "verify"`).
- Signing in with an emailed code or with Google counts as verified.

**Admin "New customer" email.** Send it only once the email is verified, so junk addresses never reach the admin.
- Code: `User::saved` hook → `App\Support\AccountAlerts::verified()`, inside `DB::afterCommit`.
- It skips console-created users and fires once.
- A migration marks existing admins verified so nobody is locked out (`2026_11_19_180000_verify_existing_administrators.php`).

**Traps:**
- `Web::url` uses `NEVELA_WEB_URL` for email buttons, reset links, OAuth callbacks *and* the passkey host. Until the dashboard is hosted, every email button points at `localhost`.
- **Nevela should refuse to deploy, or warn loudly, when `NEVELA_WEB_URL` is localhost in production.**

## 6. Order emails to admins

When a customer places or cancels an order, every admin gets an email (`App\Support\OrderAlerts`):
- the subject "New order JM-0017: UGX 11,500";
- who ordered, with phone and collection or delivery;
- each line with its quantity and price;
- the total;
- **"Delivery place: …"** for deliveries. That field is "Where to deliver" on the form, so label it that way, not "Note from the customer".

The emails are sent after commit, and a send failure is reported but never fails the order. Generate this for any app with a shop.

## 7. Push notifications, end to end

**Server:**
- a `push_tokens` table with `user_id`, a unique `token` and `platform` (`2026_11_19_120000_create_push_tokens_table.php`);
- `PUT /api/push-tokens` and `DELETE /api/push-tokens/{token}` (`PushTokenController`):
  - the token must match `/^Expo(nent)?PushToken\[[^\]]+\]$/`;
  - the token is upserted, so **the last person to sign in on a phone owns it**;
- `App\Support\Push::send($userIds, $title, $body, $url)`:
  - posts to `https://exp.host/--/api/v2/push/send` in batches of up to 100, with a 5-second timeout;
  - deletes tokens whose ticket says `DeviceNotRegistered`;
  - never throws.
- When pushes go out:
  - **admins** get one beside each order email (a new or cancelled order);
  - **the customer** gets "Your order JM-0016 is now Ready" whenever staff change the status (an `Order::updated` hook, after commit, skipped when the customer changed it themselves).
- Nevela's bell notices are raw DB inserts with no events, so pushes are sent *beside* the alert code, not from the notices.
  - **Nevela should emit an event, or call a hook, on each notice**, so pushes can follow the bell automatically.

**App:**
- `lib/push.ts`:
  - asks for permission once;
  - creates an Android channel `default` with HIGH importance, before asking (Android 13+);
  - calls `getExpoPushTokenAsync({ projectId })` and PUTs the token.
- `signOut` calls `forgetPush()` *before* revoking the token.
- `lib/alerts.tsx`:
  - follows a tapped push to its page (`data.url`, the same links as the bell);
  - handles the push that opened the app (`getLastNotificationResponseAsync`), followed only once;
  - reloads the bell when a push arrives in the foreground. The foreground system banner is suppressed, because the in-app banner shows instead.
- The web build has no push; it polls the bell.

**Android setup that must be in the scaffold's checklist:**
- a Firebase project, with `google-services.json` committed and `android.googleServicesFile` set in `app.json`;
- the FCM V1 service account key uploaded with `npx eas-cli@latest credentials`. It's secret, so never commit it.
- Without them, EAS Android builds fail.
- iOS needs an Apple Developer account.

**Trap:**
- **"Push didn't arrive" was a test that signed out.** Signing out deletes the phone's token, by design. To prove delivery, check Expo *receipts* (`getReceipts`) as well as tickets. Bad FCM credentials only show up in receipts.

## 8. Over-the-air updates from the first build

**What.** `expo-updates` plus EAS Update, configured with `npx eas-cli@latest update:configure`:
- `runtimeVersion: { policy: "appVersion" }`;
- `updates.url`;
- a `channel` on each build profile (`preview`, `production`).

**Why on day one.** Any APK built without it can never receive updates; every tester has to reinstall. With it, screen, wording and feature changes ship with `npm run update:preview`:

```
eas update --channel preview --environment preview --platform android
```

Phones apply an update after one or two cold launches. A new APK is needed only for native changes: icons, splash, plugins, permissions, new native modules, or bumping `version`.

**Nevela should:**
- include `expo-updates` and the configured channels in the template;
- document that SDK 55+ needs `--environment` when publishing.

## 9. The web version for iPhone users (no Apple account yet)

The same Expo app is exported for web (`expo export -p web`) and hosted as a **Sevalla static site**:
- root `apps/mobile`;
- install with `npm ci`;
- build with `EXPO_PUBLIC_API_URL=… npm run export:web`;
- publish `dist`;
- **use `index.html` as both the index and the error file**, so app routes load directly.

Sign-in is kept in localStorage on the web (`lib/storage.ts`). The API's default CORS (`*`) plus bearer tokens just work.

**Traps:**
- **Static hosts skip `node_modules` folders.** Expo's web export puts icon fonts under `dist/assets/node_modules/…`, so every icon rendered as a box. `apps/mobile/scripts/export-web.mjs` renames that folder to `assets/vendor` and rewrites the references. **Nevela's web export should do this itself.**
- On the web, `Appearance.setColorScheme` doesn't exist. Calling it crashed the app when a theme choice was stored, so guard it (`lib/theme.ts`).
- Phones cache the old site hard. When an icon fix "doesn't work", test in a private tab first.

## 10. Hosting: one cheap Sevalla process

| Piece | Where | Notes |
|---|---|---|
| API | Sevalla app, size h1, one process, a 10 GB disk at `/data` | SQLite at `/data/database.sqlite`, uploads at `FILES_ROOT=/data/files`, `QUEUE_CONNECTION=sync` (a disk belongs to one process) |
| Scheduler | inside the web process: `(php artisan schedule:work &)` in the start command | a separate cron process can't see the disk |
| Dashboard | Sevalla app, size h1, Ingot with `build_path: apps/web` | Vercel Hobby is non-commercial, so it can't host a business |
| Customer web | Sevalla static site | free |

**Traps:**
- **Never cache routes** (`INGOT_LARAVEL_OPTIMIZE=false`, no `route:cache`). Nevela 0.33 registers the `nevela-auth` rate limiter and the `nevela.throttle` alias only when routes aren't cached, so a route cache makes sign-in return 500. **Fix this in Nevela**: register them regardless.
- **SQLite under parallel requests** answered `database is locked`. The app's home makes many requests at once, and the rate limiter's cache does a read-then-write. Ship these defaults for SQLite in `config/database.php`:

  ```php
  'busy_timeout' => (int) env('DB_BUSY_TIMEOUT', 5000),
  'journal_mode' => env('DB_JOURNAL_MODE', 'wal'),
  'synchronous' => env('DB_SYNCHRONOUS', 'normal'),
  'transaction_mode' => env('DB_TRANSACTION_MODE', 'IMMEDIATE'),
  ```

- **`NEVELA_PROXY_SECRET`** has to be the same on the API and the dashboard. On Sevalla it's a write-only secret, so set a fresh one on both. The dashboard checks it **once per process start**, so restart the dashboard after changing the API's value.
- Sevalla's "restart" deploy sometimes fails within a second without touching anything. A normal deploy works.
- API auto-deploy was off. Every API change needs a manual deploy, or turn auto-deploy on with `allow_deploy_paths: ["apps/api/**"]`.

## 11. Look and feel: flat, light, one accent color

Based on the flat light guide (jb.desishub.com, "flat-light-mobile-app-style-guide"), adapted to white and true-black themes.

**Tokens** (`apps/mobile/src/lib/theme.ts`):

| Token | Light | Dark | Use |
|---|---|---|---|
| background / surface | `#FFFFFF` | `#000000` / `#0B0B0B` | screens; cards with hairlines |
| fill | `#F2F4F5` | `#1A1A1A` | search, chips, steppers, placeholders |
| border | `#E6E9EB` | `#262626` | hairlines |
| text / muted / faint | `#111B21` / `#5F6B73` / `#8696A0` | `#F5F5F5` / `#A3A3A3` / `#737373` | |
| brand / onBrand | `#C9410B` / white (4.95:1) | `#FF7A1A` / black (8:1) | buttons, links, active tab |
| brandSoft | `#FFF1E8` | `#2A1407` | selected chip, active tab pill, icon circles |
| brandVivid | `#EA580C` | `#FF7A1A` | hero buttons only, with a bold label of 19px or more |
| info / success / danger (+Soft) | blue / green / red | | status pills |

**Rules:**
- Orange marks things and never floods them: one primary button per view, the active tab and links.
  - No solid colored section blocks. A purple "specials" block was the first thing the client asked to remove.
- Check contrast for every color pairing.
  - White on `#D9480F` is 4.3:1, which fails, so the brand was darkened to `#C9410B`.
  - In dark mode, put black text on orange.
- Hairlines instead of shadows. Only floating things (sheets, toasts, the hero button) get a shadow.
- Pill buttons (height 48; hero 56 with an arrow). Grey chips that turn soft orange when selected. Soft tinted status badges.
- The tab bar sits in the page flow, not floating: white with a hairline on top, and the active icon in a 60×32 `brandSoft` pill.
- Fields: subtle 1px border at rest, an orange border on focus, an optional leading icon, and `inline` mode with the label as the placeholder.
- Dark mode is true black. Decorative orange shapes are hidden on black.
- The splash and Android adaptive-icon backgrounds are white in light mode and black in dark mode (`app.json`).
- The appearance choice (Phone's, Light, Dark) lives in Settings and is stored.

## 12. Sign-in and sign-up screens

The client's approved direction (`app/sign-in.tsx`, `app/sign-up.tsx`, `components/auth-ui.tsx`):

1. **Brand with room:** a 96px logo, the name at 40px weight 800, and a 17px muted line under it.
2. **Inputs:** bordered, 56px tall, with leading icons (mail, lock, person, keypad) and the label as the placeholder. Password fields have an eye toggle.
3. **Primary button:** bright orange, white bold 19px label, an arrow, and a soft orange glow. It is the strongest thing on the screen.
4. **"or" divider** before the other ways in (social buttons and the code or password switch).
5. **Text links:** the words in grey, only the action in orange ("New here? **Create an account**").
6. **"Keep browsing →"** as a quiet text action, shown only when there's somewhere to go back to.
7. Soft orange shapes in two corners in light mode; none in dark.

Every state uses the same style: password, emailed code, verify step, second step and social. When sign-in opens from the cart or a like, the subtitle says why ("Sign in to add it to your cart. You'll come back to it.").

## 13. The intro screen

The logo animates on launch:
1. the glass fills with juice;
2. the straw drops in;
3. the leaf pops;
4. the name rises;
5. "Powered by Nevela Framework" fades in.

A tap skips it, and Reduce Motion settles it at once (`components/intro.tsx`, react-native-svg plus Reanimated). Make this a template slot that takes the app's own logo layers.

## 14. Handing an app to a client

This should be in the docs, and ideally in a `nevela handover` checklist:
- The client signs up themselves (never take their password). The developer gives their account `ADMIN` under People.
- The developer keeps a separate, disclosed developer admin, or removes their own admin rights.
- Every admin receives order emails and pushes. Consider an "owner only" setting.
- The services run on the developer's accounts: Sevalla, Brevo, Expo, Firebase and GitHub. Agree who pays and who maintains them, or transfer each one.
- The sender domain should be one the client owns, if it's their brand.

---

## Build-day checklist (what `nevela new --mobile` should leave done or asked)

- [ ] Two roles, ADMIN and CUSTOMER, with sign-up giving CUSTOMER and email verification on
- [ ] Staff shell with Home, Orders, Catalogue and More; customer shell with guest browsing
- [ ] `/shop-figures`, order lists with items, and multi-value filters
- [ ] Order and new-customer emails to admins, through an HTTPS mail API, from an authenticated domain with DMARC
- [ ] Push: table, endpoints, `Push::send`, app registration, sign-out cleanup, tap-to-open, Android channel, Firebase and FCM checklist
- [ ] `expo-updates` with channels, and an `update:preview` script
- [ ] A web export that survives static hosting (no `node_modules` folder in `dist`), plus a Sevalla static site recipe
- [ ] SQLite with WAL, busy_timeout and IMMEDIATE transactions; no route cache needed; scheduler inside the web process
- [ ] A warning when `NEVELA_WEB_URL` is localhost in production; restart the dashboard after the proxy secret changes
- [ ] Flat light and true-black theme tokens with contrast-checked brand pairs; bordered fields; pill buttons; flat tab bar
- [ ] The sign-in and sign-up design above, in every state
- [ ] The release notice moved off business screens
- [ ] Handover docs
