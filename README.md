# Juice Me

A [Nevela](https://nevela-docs.vercel.app) app: a Laravel API in `apps/api` and a Next.js dashboard in `apps/web`.

## Run it

```sh
php nevela dev
```

That starts the Laravel API and the dashboard together and prints where each is: normally http://127.0.0.1:8000 and http://localhost:3000. If another program already has a port, it uses the next free one. Sign in at http://localhost:3000/sign-in.

To check the app at any time (versions, migrations, users, and whether the dashboard is reaching this API):

```sh
php nevela status
```

The app starts with an administrator, in your local database only:

| | |
|---|---|
| Email | `admin@example.com` |
| Password | `password` |

Ten sample users are there as well, with the same password: two editors and eight users, one of them switched off. They are under **Users** in the dashboard, and what each role may do is under **Roles**. Delete them before real use.

Everything else runs from this folder too, with `php nevela`:

```sh
php nevela user        # add someone who can sign in
php nevela status      # versions, migrations, users, and what the dashboard is talking to
php nevela upgrade     # bring this app to the latest Nevela
php nevela             # everything it can do
```

## The mobile app

`apps/mobile` is an [Expo](https://expo.dev) app for iOS and Android. It signs in to the same API with the same accounts.

```sh
php nevela dev                        # the API, open to your network while a mobile app is in the project
cd apps/mobile && npx expo start      # in another terminal
```

Scan the QR code with the Expo Go app on a phone that is on the same Wi-Fi, or press `a` or `i` for an emulator. More: https://nevela-docs.vercel.app/guides/mobile-app/

## The blog

The site has a blog at http://localhost:3000/blog. Posts are written under **Posts** in the dashboard, and a post is on the site once it is published. Its pages are in `apps/web/app/blog` and its settings in `apps/web/lib/blog.ts`: both are yours to change.

## Add a resource

```sh
php nevela resource Product --fields="name:string, sku:string!, price:money, notes:text?"
```

That creates the table as well. Reload the dashboard: Products is in the sidebar. Fill it with `php nevela seed Product`.

## Before real use

Every policy in `apps/api/app/Policies` starts by allowing any signed-in user. Write your rules there.

Docs: https://nevela-docs.vercel.app
