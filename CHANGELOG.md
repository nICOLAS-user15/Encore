# Changelog

All notable changes to Encore are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Reps in reserve (RIR):** right after completing a set, the rest bar asks how many reps were left (0, 1, 2 or 3+), one tap and optional. It can also be set in the set editor and shows next to the set in the workout and the history.
- Exercises you created can be edited (name, muscle group, equipment) and deleted from their progress screen. An exercise still used by a routine asks you to remove it from there first; past workouts keep it in the history.
- **Plate calculator:** the set editor of barbell exercises shows which plates go on each side ("Per side: 20 + 2.5"), following the load as you change it. Set your bar weight and the plates your gym has in Settings.
- The post-workout summary offers a backup when the last one is a week old (or never happened), right when the phone is already in your hand.
- **Body weight:** a new screen in the side menu to log your weight, with the latest value, the 7-day average and how it moved against the week before, a chart and the list of entries. It is included in backups; backups from earlier versions still restore.
- A weekly goal: by default one workout per routine of your split (Upper/Lower with 4 routines = 4 a week), or a number you choose in Settings; the Workout tab shows this week's progress and how many weeks in a row you have hit it.
- A monthly calendar at the top of History: the days you trained are filled in, with the month total, and you can go back through past months.
- A post-workout summary: finishing a workout opens it with "Workout complete", how your volume compares with last time (or that it is your first time) and a "Done" button back to the workout list.
- Each set of the workout shows what you did in the same set last time ("Last: 25 kg × 8"), so the number to beat is right there.
- Notes per exercise: write a short note during the workout ("close grip", "shoulder felt off") from the exercise's ⋯ menu, and it shows up the next time you do that exercise. Notes can also be added or fixed in the history and travel with the backup.
- Finished workouts can be corrected: tap a set in the history to fix its load or reps, delete it (with undo), or add a set you did but forgot to log. Records, comparisons and charts follow the correction.

### Changed

- History is grouped by month and loads 20 workouts at a time ("Load more"), so it stays quick after years of training.
- The end of a rest is harder to miss: the screen flashes once and the vibration and beep repeat a few times until you dismiss the bar.
- The opening animation plays only once a day: opening the app again between sets goes straight to the workout.
- "Finish workout?" now says how many unmarked sets will be discarded, so a forgotten ✓ does not go unnoticed.
- The workout timer starts on its own when the first set is completed, if you did not start it yourself.

### Fixed

- Opening a routine just to look at it no longer shows "Workout in progress": a workout only counts as in progress once the timer is started or a set is completed.
- Deleting a set offers "Undo" again.
- A quick double tap on a set's ✓ or on "Complete set" no longer un-completes the set.
- A routine opened just to look at it and started hours later becomes a fresh workout, with the right date and duration in the history.
- Switching routine while the timer is running now asks first, instead of discarding the workout.
- "Back" works again when the app opens straight on the workout in progress.
- Backups from a device whose routines were all deleted before workout splits existed could not be restored; they now can, and every export is checked before it is saved.
- "Backup exported" only shows (and the backup reminder only resets) when the file was really saved.

## [1.0.0] - 2026-11-19

### Added

- **Personal records:** a completed working set that beats your heaviest load or your estimated 1RM (Epley) for that exercise gets a PR badge, a "New record" notice and a count on the workout detail. Warm-up sets, bodyweight sets, ties and the first time an exercise is ever done are never records.
- **Exercise progress:** tapping an exercise in the Exercises tab opens its own screen with personal bests, charts of the estimated 1RM and the heaviest load per session (most reps for bodyweight exercises) and the list of sessions, each linking to its workout.
- **Weekly volume:** a "This week" card at the top of History with the total volume and one bar per muscle group, from Monday until now.
- A progress bar in the active workout, loading placeholders instead of blank screens, and summary numbers that count up.
- Panels close by dragging them away: sheets downwards, the side menu to the left.
- A short vibration when a set is completed (Android).
- End-to-end tests (Playwright) against the production build, including a test that logs a workout with the network turned off.

### Changed

- New visual depth: three surface levels, a soft light on cards, a glow on the screen's primary action, list entrances and screen transitions that follow the navigation direction. Everything respects the system's reduced-motion setting.
- The code, documentation and commit history are now in English. The app itself is still available in Portuguese and English.

### Fixed

- The side menu and sheets now close when tapping outside them on iOS.

## [0.1.0] - 2026-11-19

First version.

### Added

- Offline-first PWA: installs on Android and iOS, works with no signal and keeps all data on the device (IndexedDB).
- Active workout from a routine or free, with every set pre-filled from the last time, warm-up sets, a workout timer with pause and automatic rest between sets.
- Load suggestions through double progression, using each equipment's load step.
- Routines grouped in splits (Upper/Lower, PPL...), with sets, rep ranges and rest per exercise.
- A library of about 100 exercises, accent-insensitive search and custom exercises.
- History with duration, sets and volume per workout, compared with the previous time of the same routine.
- Undo after deleting, backup export and import, and a reminder when the last backup is old.
- Portuguese and English, screen kept awake during a workout and a sound when rest is over.

[Unreleased]: https://github.com/nICOLAS-user15/Encore/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nICOLAS-user15/Encore/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/nICOLAS-user15/Encore/releases/tag/v0.1.0
