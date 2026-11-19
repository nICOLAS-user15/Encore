# CLAUDE.md

Guide for agents working in this repository.

## Vision

Encore is a PWA for logging strength workouts, used for real at the gym (phone, sweaty hands, bad signal). It is also a portfolio and learning project. So:

- Briefly explain important decisions.
- Prefer simple, readable code over "clever" solutions.
- Do not add dependencies without justifying them.
- **Everything in the repository is written in English**: code, comments, test names, docs and commit messages. The only exception is the app's Portuguese UI text (`src/i18n/pt.ts`) and the sample data that belongs to it (exercise names, notes).

## Offline-first (the core rule)

- **No back end for now.** IndexedDB (via Dexie) is the source of truth. Nothing may depend on the network to work.
- Never load CDN resources (fonts, scripts, images): everything must be in the service worker precache.
- Future sync will be built on top of the local database. Preserve the rules below.

## Stack

Vite 8 · React 19 · TypeScript 6.0 (`strict`) · Tailwind CSS v4 · React Router v8 · Dexie 4 + dexie-react-hooks · vite-plugin-pwa · Vitest + Testing Library + fake-indexeddb · Playwright (E2E) · ESLint + Prettier · pnpm.

- TS stays on 6.0 because `typescript-eslint` does not support 7 yet. Do not upgrade without checking that.
- `pnpm-workspace.yaml` exists to isolate the project: a parent folder on the author's machine has its own pnpm workspace.
- React Router: import from `react-router` (not `react-router-dom`); `RouterProvider` comes from `react-router/dom`.

## Commands

```bash
pnpm dev             # dev server
pnpm build           # tsc -b + vite build (generates the service worker)
pnpm preview         # serves the build; use it to test offline
pnpm lint            # eslint + prettier --check
pnpm format          # prettier --write
pnpm test            # vitest run
pnpm e2e             # Playwright against the production build (E2E_CHANNEL=chrome reuses the local Chrome)
pnpm e2e:screenshots # regenerates the README images in docs/img/ (fictitious data, English UI)
pnpm generate-icons  # PWA icons from public/logo.svg
```

Before calling a task done, `pnpm build`, `pnpm lint` and `pnpm test` must pass.

## Structure

- `src/app/`: router (`routes.tsx` exports the routes for tests), `AppLayout` (TopBar + SideMenu + BottomNav), `Splash`, `UpdatePrompt`, `startPage.ts` (opening the app from scratch always lands on `/treino`, before the router is created; a reload keeps the page).
- Route paths are Portuguese (`/treino`, `/rotinas`, `/exercicios`, `/historico`, `/configuracoes`, `/sobre`): they are part of installed PWAs (`start_url`), so do not rename them casually.
- Exercises: "free weights" vs "machines" is derived from the equipment by `exerciseKind()` (src/features/exercises/exerciseKind.ts: machine and cable = machines); it is not stored in the database.
- Inner screens declare `handle: { backTo: "/parent" }` on the route: the TopBar shows "Back" (goes back in history; without history, goes to `backTo`). The main tabs show menu + settings.
- `src/i18n/`: `pt.ts` (source of truth and the `Messages` type), `en.ts`, `context.ts` (`useI18n`: `t`, `format`, `exerciseName`, `language`) and `I18nProvider` (reads the language from settings).
- `src/features/settings/`: settings (a single record with the fixed id `SETTINGS_ID`, written by `updateSettings`, an exception to the repository rule) and the About screen.
- `src/features/<area>/`: screens and logic for each tab (workout, routines, exercises, history). Pattern per area: `*Actions.ts` (writes, receive `db` as a parameter), `*Queries.ts` (reads), `*Stats.ts` (pure functions) and `.tsx` components. Screens read with `useLiveQuery` and update on their own.
- Active workout = a workout with `endedAt === null` (only one at a time; `startWorkout` returns the existing one). A workout's exercises are derived from its sets (`groupSetsByExercise`); there is no WorkoutExercise table.
- Workout routes: `/treino` = list (`StartWorkout`, with a "Continue" card when a workout is open); `/treino/:workoutId` = `ActiveWorkoutScreen` (handle `backTo: '/treino'`), which redirects on its own when the workout finishes (history) or is discarded (list); `ActiveWorkout` does not navigate. Screens that start a workout use `startOrSwitchWorkout` (free switch if the open workout has no completed set; otherwise `blocked` → confirmation) and navigate to `/treino/<id>`. The Workout tab points to the workout in progress (`activePrefix` in BottomNav). Opening the app with a workout in progress goes straight to it (once, in `AppLayout`). **"In progress" = begun** (`hasWorkoutBegun`: timer started or a set completed; read it with `getWorkoutInProgress`): a workout that was only opened is not announced anywhere (no banner, no "Continue" card, its routine shows "Start"), but it stays open, so tapping the same routine again reopens it.
- Workout splits (src/features/splits/): a `Split` groups routines (Upper/Lower, PPL...). `Routine.splitId` points to it; the split tabs (`SplitTabs`) appear in Workout, Routines and the routine editor, and the chosen split is kept in `Settings.activeSplitId` (a single value for the whole app; `useSplits()` resolves and saves it; if the id is gone, the first one applies). Rules: the sequence ("next") is PER split (`lastRoutineIdInSplit`; a routine's position is among the routines of the same split); `deleteSplit` deletes the split AND its routines (soft delete, returns how many; the screen confirms with the number; history stays); an orphaned routine (non-existent split) shows up in the first split (`routinesOfSplit`); `createRoutine` requires the `splitId`; `moveSplit` renumbers 0..n so ties in `order` do not block moving.
- Routines: editor at /rotinas/:routineId (existing) and /rotinas/nova?divisao=<id> (new). It works on a DRAFT (`routineDraft.ts`, pure functions): nothing reaches the database until the **Save** button (`saveRoutine`: a single transaction that creates/updates the routine, deletes/creates/updates exercises in draft order, changes the split and renumbers the destination split's sequence). A new routine only exists after Save. Leaving with changes opens "Discard changes?" (`useBlocker`; `allowLeave` lets Save/Delete through). Reordering exercises and the routine belongs to the draft (`moveDraftItem`, `position`).
- **The app starts empty:** no routine, split or personal workout ships in the code (the sample program was removed). Sample data exists only for tests, in `src/test/fixtures.ts` (`importTestProgram`, generic values), which the app never imports. Do not put personal data in anything that reaches the browser.
- Exercises outside the library: in `ExercisePicker`, typing a name that does not exist offers "+ Create" (`NewExerciseForm`: muscle group and equipment required, no default). `createCustomExercise` saves with `isCustom: true`, the name in both languages, and returns the existing one if the name already exists in any language (`nameKey` in `src/lib/text.ts`).
- `src/db/`: `types.ts`, `db.ts` (schema and versions; `SCHEMA_VERSION` must equal the highest `db.version(...)`), `migrations/` (one upgrade function per version, with a test; current schema = v3, which created `splits`), `repository.ts` (writes), `queries.ts` (reads), `seed.ts`.
- `src/ui/`: base components and `theme.css` (tokens + base CSS).
- `src/lib/`: pure, testable functions.

## Database rules (Dexie)

- IDs: UUID generated on the client with `crypto.randomUUID()`. Exception: the seed uses fixed IDs (do not change the existing ones).
- Seed (`src/db/seed.ts`): `SEED_EXERCISES_V1` (the 25 originals, **frozen**: migration v2 depends on them) + `SEED_EXERCISES_LIBRARY` (the extended library). `syncSeedExercises` runs on every launch and only adds what is missing: it skips ids that already exist (including deleted ones, so they do not "come back to life") and names that already exist in any language (so program exercises are not duplicated). Seed rows get `updatedAt: 0` so they never beat a version coming from a backup. To add exercises, append them to `LIBRARY` with a new fixed UUID. Migrations must never read the current seed list.
- Every record extends `BaseRecord` (`id`, `createdAt`, `updatedAt`, `deletedAt`). Dates are epoch ms (`number`).
- **Writes go through `src/db/repository.ts`** (`createRecord`, `updateRecord`, `updateRecordWith`, `softDelete`, `restoreRecord`), never `table.add/put` directly in screens. They read and write in one transaction, so double taps do not overwrite each other. Documented exceptions that must keep the original `id`/`updatedAt`: backup import, the seed and migrations.
- **Deletion is always soft** (`softDelete`). Reads filter with `isActive`.
- Load is always in kg (`weightKg`); convert only for display (`src/lib/units.ts`).
- Changed indexes or tables? Create `db.version(N + 1)` with `.upgrade(...)` in `src/db/migrations/vN.ts` and a test that opens a database of the previous version; never edit a published version. The author HAS real data: migrations must preserve it.
- Exercises have `names: { pt, en }` (not `name`). On screen, use `exerciseName(exercise)` from `useI18n`. Programs and the seed share the English name so they recognize each other as the same exercise.
- Workout: `startedAt`/`endedAt` = opened/finished; `timerStartedAt`/`timerStoppedAt` = the user-controlled stopwatch. Duration in history: `workoutDurationMs`.
- IndexedDB does not index booleans or `null`: do not create an index on `isCustom`; remember that `completedAt = null` stays out of `[exerciseId+completedAt]`.
- Tables are typed as `Table<T, ID>` (not `EntityTable`, which makes the id optional).

## Design system

Dirty, dark and minimalist: grit is the texture, minimalism is the structure. Since the v0.2 refinement there is also **light**: surfaces catch light and the primary action glows, but always with the named tokens below (never ad-hoc `shadow-lg` or arbitrary gradients).

- Tokens in `src/ui/theme.css` (`@theme`). Tailwind's default color, radius and shadow scales were **removed**; use only: `background`, `surface`, `surface-high`, `text`, `muted`, `line`, `line-strong`, `accent`, `accent-bright`, `accent-pressed`. Elevation has three levels: `background` (base) < `surface` (cards) < `surface-high` (sheets, bottom bar, dock notices). Control borders (buttons, fields, chips) use `border-line-strong` (≥3:1 contrast); `line` is only for dividers and cards.
- **A single accent color**, only for the screen's primary action and records (PRs). `accent` on backgrounds/buttons, `accent-bright` on text and small icons, `accent-pressed` for the pressed state. The active tab and navigation states do NOT use the accent.
- **One red button per screen.** When the primary action changes (e.g. "Start timer" before the first set, "Finish workout" after), the red moves with it. Confirmations that delete (discard, remove, delete) use `ConfirmSheet destructive` (a `destructive` button, light on dark), never red.
- Minimum text size is `text-xs` (12px): no `text-[11px]`.
- Typography: `font-display` (Oswald) for headings and big numbers, `font-sans` (Inter) for body text, `tabular-nums` for loads and reps.
- Thick (`border-2`/`border-4`), square borders; radius only `rounded-sm` (2px) or `rounded-md` (4px).
- **Light (allowed, with limits):** only the named shadows in `theme.css` (`shadow-edge` = 1px top light line, `shadow-card`, `shadow-raised`, `shadow-glow` = the primary action's red light) and the two ambient gradients already defined (the warm glow at the top of `body`, and `tab-active`). No other gradients or shadows. The `primary` button is the screen's single point of light.
- **Loops (allowed, with limits):** only for things that are ALIVE: `animate-pulse-glow` (the in-progress dot, ≥3s) and `animate-skeleton` (loading blocks). Never decorative. The reduced-motion rule makes every animation run once.
- **Forbidden:** decoration with no function, looping animation on content, and any gradient/shadow outside the tokens above.
- **Motion (approved by the author):** short (≤ ~450ms), dry, and only when it helps understanding. Tokens in `theme.css` (`animate-splash-*`, `sheet-in`, `menu-in`, `fade-in` on `backdrop:`, `screen-in` on screen change via `key={pathname}` in AppLayout, `dock-in` on dock children, `stamp` on the ✓ only after the tap, `nudge` when rest ends, `screen-in-forward`/`screen-in-back` (direction of the screen change, from `useNavigationType`), the `stagger` utility (lists enter 40ms apart), the `press` utility (tappable cards sink a hair), `glitch`/`glitch-ghost` on the menu's `GlitchWordmark`). Buttons sink with `active:scale-*`. A global rule in `@media (prefers-reduced-motion: reduce)` zeroes everything: no per-component `motion-reduce:` needed. Two animations on the same element fight over the `animation` property: use layers (e.g. RestTimer).
- The entrance (Splash) lasts `SPLASH_DURATION_MS` = 1800ms; changing one means changing the `splash-*` tokens too. A tap skips it.
- Mobile: touch targets ≥ 48px (`min-h-12`), inputs ≥ 16px, safe areas with `pt-safe`/`pb-safe`, no overscroll, `user-select: none` on UI (already in the base CSS).
- Base components in `src/ui/`: Button, Card, ScreenHeader, BottomNav, NumberStepper, EmptyState, Sheet, ConfirmSheet, BottomDock, Toast, Logo (`stamp`/`wordmark`), icons (own SVGs, no icon library).
- Panels close by dragging (`useSwipeToDismiss`: Sheet by its header, down; SideMenu to the left) and by tapping outside (`cursor-pointer` on the `<dialog>` is required: iOS Safari does not dispatch `click` on non-clickable-looking elements). Loading screens use `SkeletonList` instead of rendering nothing. `AnimatedNumber` counts numbers up in the history summary; `tapFeedback()` vibrates 15ms when a set is completed (Android). The active workout has a compact header and a `WorkoutProgress` bar.
- Panels (Sheet, SideMenu) are native `<dialog>`s via `useModalDialog(open)`: the browser handles focus, the inert background and Esc. Content is only rendered while `open`. Sheet has a ← "Back" arrow to the left of the title; `dismissOnBackdrop={false}` stops a tap outside from discarding typed values (used by the set editor).
- Fixed notices above the tabs (rest, new version, "Workout in progress", toasts) go inside `<DockItem>`: they stack in the dock (`BottomDockProvider` in App.tsx). Do not create another `fixed bottom-...`.
- Logo: `public/logo.svg` is the source of the PWA icons (`pnpm generate-icons`); the `Logo` component uses the same drawing.

## Code conventions

- Identifiers, comments, test names and docs in English.
- **No hard-coded UI text in components**: add the key to `src/i18n/pt.ts` AND `src/i18n/en.ts` and use `t.area.key`. Numbers and dates go through `format.*` from `useI18n`. Language names appear in their own language ("Português", "English").
- Components are named functions with named exports (no `export default`).
- Props typed with `type`; no `any`.
- Tests live next to the file (`*.test.ts(x)`); database tests use `createDatabase('<unique name>')`. End-to-end specs live in `e2e/` (Playwright, run by `pnpm e2e` and in CI, excluded from Vitest); they use the Portuguese UI labels and navigate through the UI (opening a URL from scratch always lands on `/treino`). `e2e/offline.spec.ts` is the proof of the offline promise: keep it green. `e2e/screenshots.spec.ts` is not a test: it is the "screenshots" Playwright project (outside `pnpm e2e` and CI), which imports the fictitious history from `e2e/showcaseData.ts` through the real Import button, with the clock frozen and the UI in English. A screen change that shows in the README means running `pnpm e2e:screenshots` again and committing the new images.
- **Commits:** Conventional Commits **in English**, formatted `type(scope): summary in the imperative`, up to ~70 characters, no trailing period. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`. Scope = the feature area (`workout`, `routines`, `splits`, `exercises`, `history`, `settings`, `db`, `i18n`, `ui`, `app`, `pwa`, `deploy`), optional. Examples: `feat(workout): add pause and resume to the timer`, `fix(settings): validate the backup before importing`. One commit per feature or fix (code + test + docs together); no `docs:` commits that merely trail a `feat:`.
- **No AI attribution:** commit and PR messages carry no `Co-Authored-By`, no "Generated with Claude Code" and no mention of AI.
- **The author makes the commits.** Agents do not run `git commit`/`git push`: they hand over the commands (`git add <files>` + `git commit -m ...`, one per feature) for the author to run.
- **Changelog:** a user-visible change also adds a line under `## [Unreleased]` in `CHANGELOG.md`, in the same commit (written for users, not as a commit list).

## Releases

Versions follow Semantic Versioning (bug fixes = patch, new features = minor, breaking changes, such as dropping old backups, = major). The About screen shows the `package.json` version.

1. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, add a new empty `## [Unreleased]` above it and update the compare links at the bottom.
2. Set `"version": "X.Y.Z"` in `package.json`.
3. Commit `chore: release vX.Y.Z`, push, then `git tag vX.Y.Z` and `git push origin vX.Y.Z` (the author runs these).
4. `.github/workflows/release.yml` checks that the tag matches `package.json` and publishes a GitHub release with that CHANGELOG section as its notes.

## The author's exercises

These are learning exercises with a TODO and tests in `describe.skip`. **Do not implement** these functions unless the author asks:

1. `src/lib/units.ts`: `kgToLb`, `lbToKg`, `formatWeight`.
2. `src/lib/time.ts`: `formatDuration` (the current placeholder only shows minutes).

(`estimateOneRepMax` in `src/lib/oneRepMax.ts` was an exercise too; the author released it and it is now implemented and tested.)

Until `formatWeight` exists, the UI shows loads in kg only via `formatDecimal`/`formatSet` (`src/lib/format.ts`).

## Features: rules the code does not show

See the README for status and roadmap.

- Per-exercise rest: `RoutineExercise.restSeconds` (`null` = the Settings default); read it with `restSecondsOf`, which covers old items without the field. The manual "Rest" button uses the exercise of the next set. Comparison summary: `ComparisonCard` on the workout detail (volume, sets and duration vs. the previous time of the same routine, via `getPreviousSummary` + `compareWorkouts`). A ⋯ menu on the exercise card (warm-up and remove; the footer only has + Set / + Encore).
- **Personal records** (`src/features/records/`): a completed WORKING set (warm-up never) is a record when it beats everything done before it in heaviest load or in estimated 1RM (`estimateOneRepMax`, Epley). The first time an exercise is ever done has no records; ties are not records; bodyweight (0 kg) never is. Inside a workout each set is compared with everything before it, including earlier sets of the same workout. `recordsStats.ts` holds the pure rules; `getExerciseBest` reads the `[exerciseId+completedAt]` index only up to the workout's start, so an old workout in the history is judged against what came before it. UI: `RecordBadge` ("PR", accent: records are one of the two allowed uses), the set's accessible name ends with "recorde pessoal", a `showInfo` toast "New record" when a set BECOMES a record on screen, and a count on the workout detail. kg/lb still waits for `units.ts`.
- **Progress (evolution):** `/exercicios/:exerciseId` (`ExerciseDetailScreen`, opened from the Exercises tab rows; the picker keeps `onSelect`) shows personal bests, two charts (estimated 1RM and heaviest load per session; most reps for bodyweight) and the sessions, newest first, linking to `/historico/:id`. Sessions come from `listExerciseSessions` (index `[exerciseId+completedAt]`, finished workouts only; pure grouping in `toSessions`). Charts use `src/ui/LineChart.tsx`, a hand-made SVG (no chart library: keep the offline bundle light), points evenly spaced per session, `role="img"` with a text summary. History shows `WeeklyVolumeCard` on top (`weeklyVolumeByMuscle`: completed working sets since Monday 00:00 local, ISO week, grouped by `Exercise.muscleGroup`; bodyweight counts sets only).
- Progression (src/features/workout/progression.ts): double progression in `suggestNextLoad` (top of the range on every set at the highest load → + step and back to the minimum; otherwise +1 rep, capped at the top). Only `normal` sets count (encore and warm-up do not). Bodyweight (`stepKg = null`) progresses in reps only. "Apply" (`applyLoadSuggestion`) changes only the pending `normal` sets. `followWeightChange`: after saving a set with a new load, pending `normal` sets that still had the old load follow it.
- Load steps per equipment: `Settings.weightStepsKg` (no index, no migration; `getSettings` merges with the default). Use `weightStepFor(settings, equipment)` for the suggestion and for the set editor's −/+.
- Timer (`WorkoutTimer`): before starting it shows "Start" + "Rest"; once started it shows "Pause"/"Resume" + "Finish workout" (opens the confirmation; `finishWorkout` also stops the timer) and the footer button disappears. Pause: `Workout.timerPausedAt` (optional, no migration); on resume, `timerStartedAt` moves forward by the paused time. ALWAYS read time through `timerElapsedMs`/`workoutDurationMs` (workoutStats.ts), never `timerStoppedAt ?? now`. Rest starts on its own when a set is completed.
- App update (`applyUpdate`): the `UpdatePrompt` "Update" button also reloads on `controllerchange` and, in the worst case, after 1.5s (`updateServiceWorker(true)` alone failed silently on phones).
- Routine/exercise notes are free text: they are not translated. `useI18n().note()` only translates the standard phrases of the old sample program (`src/i18n/notes.ts`); the database does not change.
- Warm-up (`type: "warmup"`): stays out of volume, counts and "last time"; use `isWorkingSet`, `completedWorkingSets` and `numberSets` (src/features/workout/workoutStats.ts).
- Backup (src/features/settings/backup.ts): when creating a new schema version, `parseBackup` must convert old backups (today it accepts v2 and v3: `upgradeBackupFromV2` does to the file what migration v3 does to the database, using the SAME fixed id `LEGACY_SPLIT_ID`, so the split is not duplicated). When creating v4, extend that conversion and add old-backup tests. `saveBackupFile` returns `false` if the user dismissed the share sheet; only `true` writes `Settings.lastBackupAt`. Reminder (`backupReminder.ts`): shows on the workout list when there is a finished workout and no backup for 14+ days. Use `loaded` from `useSettings` before deciding anything from the default value (avoids flashing).
- **Backup is untrusted input:** `parseBackup` validates and COPIES every row (`backupSchema.ts`); importing de-duplicates exercises by `nameKey` and closes any extra open workout (there is never a "ghost" workout).
- Audio: `unlockAudio()` only works inside a user tap; call it before any `await`.
- **Toasts and errors (`src/ui/Toast.tsx` + `toastContext.ts`):** `useAction()` wraps user-triggered writes (`run(() => ...)`) and shows an error instead of failing silently; `useToast().showUndo(msg, undo)` shows "Undo" in the dock (delete set, remove exercise, delete a workout from history). Undo = `restoreRecord`/`restoreSets`/`restoreWorkout` (deletion is always soft). Routes have an `errorElement` (`ErrorScreen`) and a failure to open the database shows `ErrorScreen database` (main.tsx).
- **Rest lives above the screens:** `RestTimerProvider` (in `AppLayout`) + `useRest()`; it only beeps on the "counting" → "over" transition and drops an already-expired rest when reopening.
- UI decisions already made: highlighted next set (`nextPendingSetId`), "workout in progress" strip, active routine with "Continue", dock, `<dialog>`. Backlog: paginated/grouped history, edit/delete custom exercise, lazy routes (React.lazy).

## Pitfalls already hit

- iOS: tapping a button does NOT take focus away from an `<input>`; do not rely on `onBlur` to save values (NumberStepper passes every valid number through `onChange`, and clears its draft when −/+ is used).
- Screen tests use the global `db` (fake-indexeddb): clear the tables in `beforeEach` and use `findBy*`/`waitFor` for anything that comes from the database. Without an `I18nProvider`, components use Portuguese (the context default). `src/test/setup.ts` raises the `findBy*` timeout to 5s because tests run in parallel.
- React Compiler lint (`react-hooks/purity`): do not call `Date.now()` during render; use `useNow()`.
- jsdom has no `<dialog>` `showModal()`/`close()`: `src/test/setup.ts` has a minimal imitation. With a panel open, its "Back" also exists: in tests, prefer waiting for the URL over looking for "Back".
