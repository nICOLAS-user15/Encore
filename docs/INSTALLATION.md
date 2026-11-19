# Install and use on your phone

A guide to publishing Encore (Vercel), installing it on your home screen and moving your workouts between devices.

The real app (installable and offline) has to be published at an **HTTPS** address. The simplest route is [Vercel](https://vercel.com), which is free and deploys on every `git push`.

## 1. Publish on Vercel (first time only)

1. Create an account at [vercel.com](https://vercel.com) by signing in with **GitHub**.
2. Click **Add New… → Project** and pick the **Encore** repository. If it does not show up (private repository), click **Adjust GitHub App Permissions** and grant access to it.
3. Vercel detects Vite on its own: build `pnpm build`, output folder `dist`. Do not change anything and click **Deploy**.
4. In about a minute you get an address like `https://encore-xxxx.vercel.app`. That is the one you will open on your phone.

From then on, **every `git push` to `main` publishes a new version automatically**. `vercel.json` takes care of the routes (opening `/historico` directly works), the security headers, and keeps the service worker from getting stuck on an old version.

## 2. Install on your home screen

Open the address on your phone **with internet** (the first visit downloads the app to the device) and install it.

**Android (Chrome)**

1. Open the address in **Chrome**.
2. Tap the **⋮** menu (top right corner), then **Install app**. In some versions the option is called **Add to Home screen**.
3. Confirm with **Install**. The Encore icon shows up next to your other apps.

**iPhone (Safari)**

1. Open the address in **Safari** (the most reliable path on iOS).
2. Tap **Share** (the square with an arrow pointing up, in the bottom bar).
3. Scroll the list and tap **Add to Home Screen**, then **Add**.

From now on, **always open it from the icon**: the app opens full screen, without the browser bar, and starts on the Workout tab.

## 3. Check offline mode

After opening the installed app once with internet, turn on **airplane mode** and open it again. Everything should work: starting a workout, logging sets, browsing the history.

## 4. Move your workouts from one device to another

Your data lives **only on the device** (there is no server). To move your workouts from a computer to your phone, or to a new phone:

1. On the source device: **Settings → Backup → Export backup**. On a computer this downloads an `encore-backup-YYYY-MM-DD.json` file; on a phone it opens the share sheet.
2. Send the file to the other device (WhatsApp, email, Drive…) and save it in **Files**.
3. **In the installed app** (opened from the icon): **Settings → Backup → Import backup** and pick the file.

Importing merges the data without duplicating anything. If the same record exists on both sides, the most recently edited version wins.

> **iPhone:** the installed app and Safari keep **separate** data. Import the backup _inside the installed app_, not in a Safari tab.
>
> **Tip:** export a backup from time to time. Changing phones or clearing the browser data erases your workouts.

## 5. Updates

When a new version ships (after a `git push`), the app shows a **"New version available"** notice above the tabs. Tap **Update**. If the notice does not appear, close the app completely and open it again with internet.

## Alternative for development: same Wi‑Fi network

To see changes on your phone without publishing, with the computer and the phone on the **same Wi‑Fi network**:

```bash
pnpm dev --host     # prints a "Network" address, e.g. http://192.168.0.10:5173
```

Open that address in the phone's browser. Limitations: without HTTPS you **cannot install the app, it does not work offline and the screen does not stay on**. It is only good for checking the look and feel. Company or campus networks often block this connection; if so, use Vercel.

## Common problems

| Problem                                      | What to do                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "Install app" does not show on Android       | Wait for the page to load completely and reload; or use **Add to Home screen** in the same menu.    |
| The rest beep does not play on iPhone        | The silent switch (on the side of the iPhone) also mutes the beep.                                  |
| The screen turns off during a workout        | Check **Settings → During the workout**. On iPhone this needs iOS 18.4 or newer.                    |
| I opened it on my phone and have no workouts | Expected: data does not travel on its own. Follow step 4 (backup).                                  |
| The new version does not arrive              | Close the app completely and open it with internet; the "New version available" notice should show. |
