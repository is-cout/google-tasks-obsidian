import { ItemView, Menu, WorkspaceLeaf } from "obsidian";
import ScheduleTasksComp from "../svelte/ScheduleTasksComp.svelte";
import type GoogleTasks from "../GoogleTasksPlugin";

export const VIEW_TYPE_GOOGLE_TASK_SCHEDULE = "googleTaskScheduleView";

export class ScheduleTasksView extends ItemView {
	plugin: GoogleTasks;
	schedule: ScheduleTasksComp;

	constructor(leaf: WorkspaceLeaf, plugin: GoogleTasks) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_GOOGLE_TASK_SCHEDULE;
	}

	getDisplayText(): string {
		return "Tasks Schedule";
	}

	getIcon(): string {
		return "layout-list";
	}

	onPaneMenu(menu: Menu, source: string): void {
		super.onPaneMenu(menu, source);
		menu.addItem((item) => {
			item.setTitle("Refresh");
			item.setIcon("sync");
			item.onClick(() => this.schedule?.refresh());
		});
	}

	async onOpen(): Promise<void> {
		this.schedule = new ScheduleTasksComp({
			target: this.contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose(): Promise<void> {
		this.schedule?.$destroy();
	}
}
