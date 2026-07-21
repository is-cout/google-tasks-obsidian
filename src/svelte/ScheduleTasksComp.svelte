<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { moment } from "obsidian";
    import type GoogleTasks from "../GoogleTasksPlugin";
    import type { Task } from "../helper/types";
    import { getAllUncompletedTasksOrderdByDue } from "../googleApi/ListAllTasks";
    import { GoogleCompleteTask } from "../googleApi/GoogleCompleteTask";
    import { settingsAreCompleteAndLoggedIn } from "../view/GoogleTasksSettingTab";
    import { UpdateTaskModal } from "../modal/UpdateTaskModal";

    export let plugin: GoogleTasks;

    let loading = false;
    let loggedIn = true;
    let tasks: Task[] = [];
    let interval: number;
    // Refreshed on every poll so the overdue/today/future split stays current.
    let now = window.moment();
    // Eye toggle: collapse the weekday/date header (mirrors the calendar schedule view).
    let showHeader = true;

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
            const fetched = await getAllUncompletedTasksOrderdByDue(plugin);
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

    const completeTask = async (task: Task) => {
        const ok = await GoogleCompleteTask(plugin, task);
        if (ok) tasks = tasks.filter((t) => t.id !== task.id);
    };

    const editTask = (task: Task) => {
        new UpdateTaskModal(plugin, task).open();
    };

    export const refresh = () => getTasks("manual");

    onMount(() => {
        getTasks("mount");
        interval = window.setInterval(() => getTasks("poll"), Math.max(5, plugin.settings.refreshInterval) * 1000);
    });

    onDestroy(() => {
        if (interval) window.clearInterval(interval);
    });
</script>

<div class="gtask-schedule-container" class:gtask-header-hidden={!showHeader}>
    <button
        class="gtask-icon-btn gtask-schedule-eye"
        aria-label={showHeader ? "Hide date header" : "Show date header"}
        on:click={() => (showHeader = !showHeader)}
    >
        {#if showHeader}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>
        {:else}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        {/if}
    </button>
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
                    <div class="gtask-schedule-card">
                        <input
                            class="gtask-schedule-check"
                            type="checkbox"
                            aria-label="Complete task"
                            on:click|stopPropagation={() => completeTask(task)}
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
                                        on:click|stopPropagation={() => completeTask(child)}
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
