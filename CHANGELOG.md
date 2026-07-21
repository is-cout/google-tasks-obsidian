# Changelog

Running log of what this fork diverged from upstream `obsidian-google-tasks`.

## 1.6.0 — 2026-07-21

- feat: add "Tasks Schedule" view — an agenda of open tasks bucketed by day
  (Overdue / Today / Tomorrow / upcoming days / No due date) with status dots
  (red = overdue, green = today, gray = future), checkbox to complete, and click to
  edit. Opened via its own ribbon icon or the "Open Tasks Schedule View" command.
  Files: `src/svelte/ScheduleTasksComp.svelte`, `src/view/ScheduleTasksView.ts`,
  `src/GoogleTasksPlugin.ts`, `styles.css`. Why: a cleaner chronological overview
  alongside the existing list view, mirroring the calendar plugin's schedule view.
- chore: `npm run build` now copies `main.js` / `manifest.json` / `styles.css` straight
  into the Obsidian vault plugin folder via `scripts/copy-to-vault.mjs`, using the
  `OBSIDIAN_PLUGIN_DIR` set in a gitignored `.env.local`. Why: faster local iteration.
