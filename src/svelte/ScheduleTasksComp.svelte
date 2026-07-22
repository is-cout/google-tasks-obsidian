<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Menu, moment } from "obsidian";
    import type GoogleTasks from "../GoogleTasksPlugin";
    import type { Task, TaskList } from "../helper/types";
    import { getAllTaskLists, getScheduleTasks } from "../googleApi/ListAllTasks";
    import {
        GoogleCompleteTask,
        GoogleUnCompleteTask,
    } from "../googleApi/GoogleCompleteTask";
    import { settingsAreCompleteAndLoggedIn } from "../view/GoogleTasksSettingTab";
    import { UpdateTaskModal } from "../modal/UpdateTaskModal";
    import type { ScheduleViewConfig } from "../view/ScheduleTasksView";

    export let plugin: GoogleTasks;
    // Per-leaf config (which task lists, completed shown or not) owned by the view.
    export let config: ScheduleViewConfig = { listIds: [], showCompleted: false };
    export let saveConfig: (config: ScheduleViewConfig) => void = () => {};

    let taskLists: TaskList[] = [];

    let loading = false;
    let loggedIn = true;
    let tasks: Task[] = [];
    let interval: number;
    // Refreshed on every poll so the overdue/today/future split stays current.
    let now = window.moment();
    // Eye toggle: collapse the weekday/date header (mirrors the calendar schedule view).
    // Persisted so the choice survives reopening the view.
    let showHeader = plugin.settings.scheduleShowHeader ?? true;

    const toggleHeader = () => {
        showHeader = !showHeader;
        plugin.settings.scheduleShowHeader = showHeader;
        plugin.saveSettings();
    };

    const applyConfig = (next: ScheduleViewConfig) => {
        config = next;
        saveConfig(next);
        getTasks("config");
    };

    const toggleCompleted = () => {
        applyConfig({ ...config, showCompleted: !config.showCompleted });
    };

    // Task list picker: a checkable menu, so several lists can be toggled without
    // reopening it. No list checked means "all lists".
    const openListMenu = async (event: MouseEvent) => {
        if (!taskLists.length) taskLists = await getAllTaskLists(plugin);

        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle("All lists");
            item.setChecked(!config.listIds.length);
            item.onClick(() => applyConfig({ ...config, listIds: [] }));
        });
        menu.addSeparator();
        taskLists.forEach((taskList) => {
            menu.addItem((item) => {
                item.setTitle(taskList.title);
                item.setChecked(config.listIds.includes(taskList.id));
                item.onClick(() => {
                    const listIds = config.listIds.includes(taskList.id)
                        ? config.listIds.filter((id) => id !== taskList.id)
                        : [...config.listIds, taskList.id];
                    applyConfig({ ...config, listIds });
                });
            });
        });
        menu.showAtMouseEvent(event);
    };

    type Bucket = { key: string; label: string; tone: "overdue" | "today" | "future" | "none"; tasks: Task[] };

    // Google Tasks have no time-of-day, only a due date. So the "schedule" is an
    // agenda bucketed by day: Overdue (all past due dates collapsed), Today,
    // Tomorrow, then one bucket per upcoming day, and No due date last.
    const bucketFor = (task: Task, ref: moment.Moment): { key: string; label: string; tone: Bucket["tone"] } => {
        if (!task.due) return { key: "none", label: "No due date", tone: "none" };
        const due = window.moment(task.due).startOf("day");
        const diff = due.diff(ref.clone().startOf("day"), "days");
        if (diff < 0) return { key: "overdue", label: "Overdue", tone: "overdue" };
        if (diff === 0) return { key: "today", label: "Today", tone: "today" };
        if (diff === 1) return { key: due.format("YYYY-MM-DD"), label: "Tomorrow", tone: "future" };
        if (diff <= 7) return { key: due.format("YYYY-MM-DD"), label: due.format("dddd"), tone: "future" };
        return { key: due.format("YYYY-MM-DD"), label: due.format("MMM D, YYYY"), tone: "future" };
    };

    // tasks arrive sorted by due asc (untimed last), so inserting into a Map keeps
    // buckets in chronological order automatically: Overdue -> Today -> ... -> No due date.
    $: buckets = ((): Bucket[] => {
        const map = new Map<string, Bucket>();
        for (const task of tasks) {
            const b = bucketFor(task, now);
            if (!map.has(b.key)) map.set(b.key, { ...b, tasks: [] });
            map.get(b.key).tasks.push(task);
        }
        return [...map.values()];
    })();

    const dueLabel = (task: Task): string =>
        task.due ? window.moment(task.due).format("ddd, MMM D") : "";

    const getTasks = async (source = "unknown") => {
        if (loading) return;
        loading = true;
        try {
            loggedIn = settingsAreCompleteAndLoggedIn(plugin, false);
            if (!loggedIn) {
                tasks = [];
                return;
            }
            now = window.moment();
            const fetched = await getScheduleTasks(
                plugin,
                config.listIds,
                config.showCompleted
            );
            // Only reassign when something changed, so the DOM (and any open card) is stable.
            if (JSON.stringify(fetched) !== JSON.stringify(tasks)) {
                tasks = fetched;
            }
        } catch (err) {
            console.error(`[tasks-schedule] getTasks(${source}) failed`, err);
        } finally {
            loading = false;
        }
    };

    // With completed tasks visible the checkbox works both ways; otherwise a completed
    // task just leaves the list.
    const toggleTask = async (task: Task) => {
        if (task.completed) {
            if (await GoogleUnCompleteTask(plugin, task)) getTasks("uncomplete");
            return;
        }
        const ok = await GoogleCompleteTask(plugin, task);
        if (!ok) return;
        if (config.showCompleted) {
            getTasks("complete");
        } else {
            tasks = tasks.filter((t) => t.id !== task.id);
        }
    };

    const editTask = (task: Task) => {
        new UpdateTaskModal(plugin, task).open();
    };

    export const refresh = () => getTasks("manual");

    const startInterval = () => {
        if (interval) window.clearInterval(interval);
        interval = window.setInterval(() => getTasks("poll"), Math.max(5, plugin.settings.refreshInterval) * 1000);
    };

    export const restartInterval = () => startInterval();

    onMount(() => {
        getTasks("mount");
        startInterval();
    });

    onDestroy(() => {
        if (interval) window.clearInterval(interval);
    });
</script>

<div class="gtask-schedule-container" class:gtask-header-hidden={!showHeader}>
  <div class="gtask-schedule-toolbar">
    <button
        class="gtask-icon-btn"
        class:gtask-icon-btn-active={config.showCompleted}
        aria-label={config.showCompleted ? "Hide completed tasks" : "Show completed tasks"}
        on:click={toggleCompleted}
    >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </button>
    <button
        class="gtask-icon-btn"
        aria-label="Choose task lists"
        on:click={openListMenu}
    >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
    </button>
    <button
        class="gtask-icon-btn"
        aria-label={showHeader ? "Hide date header" : "Show date header"}
        on:click={toggleHeader}
    >
        {#if showHeader}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>
        {:else}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        {/if}
    </button>
  </div>
    {#if showHeader}
        <div class="gtask-schedule-header">
            <h3 class="gtask-schedule-weekday">{now.format("dddd")}</h3>
            <h1
                class="gtask-schedule-date"
                on:click={refresh}
                on:keypress={refresh}
                aria-label="Refresh"
            >{now.format("MMMM DD, YYYY")}</h1>
        </div>
    {/if}

    {#if !loggedIn}
        <span class="gtask-schedule-empty">Missing settings — log in to Google Tasks first.</span>
    {:else if !tasks.length}
        <span class="gtask-schedule-empty">No open tasks 🎉</span>
    {:else}
        {#each buckets as bucket (bucket.key)}
            <div class="gtask-schedule-section">
                <h5 class="gtask-schedule-section-title gtask-tone-{bucket.tone}">{bucket.label}</h5>
                {#each bucket.tasks as task (task.id)}
                    <div class="gtask-schedule-card" class:gtask-schedule-done={task.completed}>
                        <input
                            class="gtask-schedule-check"
                            type="checkbox"
                            checked={!!task.completed}
                            aria-label="Complete task"
                            on:click|stopPropagation={() => toggleTask(task)}
                        />
                        <div
                            class="gtask-schedule-body"
                            on:click={() => editTask(task)}
                            on:keypress={() => editTask(task)}
                        >
                            <span class="gtask-schedule-title">{task.title}</span>
                            {#if task.notes}
                                <span class="gtask-schedule-notes">{task.notes}</span>
                            {/if}
                            <span class="gtask-schedule-meta">
                                {#if task.due}<span class="gtask-schedule-due">{dueLabel(task)}</span>{/if}
                                {#if task.taskListName}<span class="gtask-schedule-list">{task.taskListName}</span>{/if}
                            </span>
                        </div>
                        <span class="gtask-schedule-dot gtask-dot-{bucket.tone}"></span>
                    </div>

                    {#if task.children?.length}
                        <div class="gtask-schedule-children">
                            {#each task.children as child (child.id)}
                                <div class="gtask-schedule-card gtask-schedule-child">
                                    <input
                                        class="gtask-schedule-check"
                                        type="checkbox"
                                        checked={child.status === "completed"}
                                        aria-label="Complete subtask"
                                        on:click|stopPropagation={() => toggleTask(child)}
                                    />
                                    <span class="gtask-schedule-title">{child.title}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                {/each}
            </div>
        {/each}
    {/if}
</div>
