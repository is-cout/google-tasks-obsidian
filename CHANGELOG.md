# Changelog

Running log of what this fork diverged from upstream `obsidian-google-tasks`.

## 2.0.1 — 2026-07-27

- fix: changing a task's list/category in the edit modal is now applied. The modal had
  two buttons — "Update" (PATCH, which the Google Tasks API cannot use to move a task
  between lists) and "Update Categorie" — so editing the dropdown and pressing "Update"
  silently dropped the list change. There is now a single "Update" button that detects a
  list change and re-creates the task in the target list, deleting the original only
  after the copy succeeds. Files: `src/modal/UpdateTaskModal.ts`,
  `src/googleApi/GoogleCreateTask.ts` (`CreateGoogleTaskFromOldTask` now returns a
  success boolean).

## 2.0.0 — 2026-07-22

- **breaking**: removed the legacy "Google Tasks" list view and its ribbon icon. The
  Tasks Schedule view is now the only view, and it inherits the old view's checkmark
  icon (`check-in-circle`). Existing "googleTaskView" leaves in a saved workspace no
  longer open. Files: deleted `src/view/GoogleTaskView.ts`, added
  `src/helper/TaskListId.ts` (kept `getListId`), `src/GoogleTasksPlugin.ts`,
  `src/view/GoogleTasksSettingTab.ts`, `src/modal/TaskListModal.ts`,
  `src/modal/UpdateTaskModal.ts`, `src/googleApi/GoogleCreateTask.ts`,
  `src/googleApi/GoogleUpdateTask.ts`. Why: two overlapping views to maintain, only
  the schedule one is used.
- feat: task list filter per schedule view — gear button in the view toolbar opens a
  checkable menu of Google task lists (none checked = all lists). The choice is stored
  in the leaf's view state, so several schedule views can be open at once, each on its
  own lists, and the selection survives a restart.
- feat: show/hide completed tasks per schedule view — leftmost checklist button in the
  toolbar, accent-colored while completed tasks are shown (as in the calendar plugin) so
  the current state is visible at a glance. Completed tasks render struck through and
  their checkbox reopens them.
- feat: `Open New Tasks Schedule View` command (and Ctrl/Cmd-click on the ribbon icon)
  opens an additional schedule view instead of revealing the one already open — the
  plain ribbon click still reveals the existing one.
  Files: `src/svelte/ScheduleTasksComp.svelte`, `src/view/ScheduleTasksView.ts`,
  `src/googleApi/ListAllTasks.ts` (new `getScheduleTasks`), `styles.css`.
- fix: changing the refresh interval in settings now restarts the poll timer of open
  schedule views instead of only applying on reopen.

## 1.6.0 — 2026-07-21

- feat: add "Tasks Schedule" view — an agenda of open tasks bucketed by day
  (Overdue / Today / Tomorrow / upcoming days / No due date) with status dots
  (red = overdue, green = today, gray = future), checkbox to complete, and click to
  edit. An eye toggle in the header collapses the weekday/date heading. Opened via
  its own ribbon icon or the "Open Tasks Schedule View" command.
  Files: `src/svelte/ScheduleTasksComp.svelte`, `src/view/ScheduleTasksView.ts`,
  `src/GoogleTasksPlugin.ts`, `styles.css`. Why: a cleaner chronological overview
  alongside the existing list view, mirroring the calendar plugin's schedule view.
- fix: editing a task's due date now persists — `UpdateGoogleTask` sends an RFC 3339
  timestamp instead of the raw `YYYY-MM-DD` the date input yields, which the Google
  Tasks API silently ignored. Also refresh the schedule view after create/update so
  changes show up immediately instead of on the next poll.
- chore: `npm run build` now copies `main.js` / `manifest.json` / `styles.css` straight
  into the Obsidian vault plugin folder via `scripts/copy-to-vault.mjs`, using the
  `OBSIDIAN_PLUGIN_DIR` set in a gitignored `.env.local`. Why: faster local iteration.
