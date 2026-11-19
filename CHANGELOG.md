# Changelog

All notable changes to Encore are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Opening a routine just to look at it no longer shows "Workout in progress": a workout only counts as in progress once the timer is started or a set is completed.

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
