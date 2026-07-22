import { ItemView, Menu, WorkspaceLeaf } from "obsidian";
import ScheduleTasksComp from "../svelte/ScheduleTasksComp.svelte";
import type GoogleTasks from "../GoogleTasksPlugin";

export const VIEW_TYPE_GOOGLE_TASK_SCHEDULE = "googleTaskScheduleView";

/**
 * Per-leaf config, so several schedule views can be open side by side, each on its
 * own task lists. Obsidian persists it with the workspace via get/setState.
 */
export interface ScheduleViewConfig {
	// Task list ids to show. Empty = all lists.
	listIds: string[];
	showCompleted: boolean;
}

const DEFAULT_CONFIG: ScheduleViewConfig = {
	listIds: [],
	showCompleted: false,
};

export class ScheduleTasksView extends ItemView {
	plugin: GoogleTasks;
	schedule: ScheduleTasksComp;
	config: ScheduleViewConfig = { ...DEFAULT_CONFIG };

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
		return "check-in-circle";
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), ...this.config };
	}

	async setState(state: any, result: any): Promise<void> {
		this.config = {
			listIds: Array.isArray(state?.listIds)
				? state.listIds
				: DEFAULT_CONFIG.listIds,
			showCompleted: state?.showCompleted ?? DEFAULT_CONFIG.showCompleted,
		};
		this.schedule?.$set({ config: this.config });
		await super.setState(state, result);
	}

	// Called by the component when the user changes the config from the view's toolbar.
	saveConfig = (config: ScheduleViewConfig): void => {
		this.config = config;
		this.app.workspace.requestSaveLayout();
	};

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
			props: {
				plugin: this.plugin,
				config: this.config,
				saveConfig: this.saveConfig,
			},
		});
	}

	async onClose(): Promise<void> {
		this.schedule?.$destroy();
	}
}
