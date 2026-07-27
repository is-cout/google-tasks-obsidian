import { DropdownComponent, Modal, Setting, moment } from "obsidian";
import { customSetting } from "../helper/CustomSettingElement";
import type GoogleTasks from "../GoogleTasksPlugin";
import { getListId } from "../helper/TaskListId";
import { getAllTaskLists } from "../googleApi/ListAllTasks";
import type { Task } from "../helper/types";
import { CreateGoogleTaskFromOldTask } from "src/googleApi/GoogleCreateTask";
import { DeleteGoogleTask } from "src/googleApi/GoogleDeleteTask";
import { UpdateGoogleTask } from "src/googleApi/GoogleUpdateTask";

export class UpdateTaskModal extends Modal {
	plugin: GoogleTasks;
	newTask: Task;
	oldTaskSelfLInk: string;
	oldListId: string;

	constructor(plugin: GoogleTasks, task: Task) {
		super(plugin.app);
		this.plugin = plugin;
		this.newTask = task;
		this.oldTaskSelfLInk = task.selfLink;
		this.oldListId = getListId(task);
	}
	async onOpen() {
		const taskList = await getAllTaskLists(this.plugin);
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Edit Task" });

		new Setting(contentEl)
			.setName("Title")

			.addText((text) => {
				text.onChange((value) => {
					this.newTask.title = value;
				});
				text.setValue(this.newTask.title);
				text.inputEl.focus();
			});

		new Setting(contentEl).setName("Details").addText((text) => {
			text.onChange((value) => {
				this.newTask.notes = value;
			});
			text.setValue(this.newTask.notes);
		});

		const dateSelectElement = customSetting(
			contentEl,
			"Due date",
			""
		).createEl("input", {
			type: "date",
		});

		dateSelectElement.addEventListener("input", (event) => {
			this.newTask.due = dateSelectElement.value;
		});

		if (this.newTask.due) {
			dateSelectElement.value = moment.utc(this.newTask.due).local().format(
				"YYYY-MM-DD"
			);
		}

		const dropDown = new Setting(contentEl);

		dropDown.setName("Categorie");
		dropDown.addDropdown((text: DropdownComponent) => {
			text.onChange((value) => {
				this.newTask.parent = value;
			});

			for (let i = 0; i < taskList.length; i++) {
				text.addOption(taskList[i].id, taskList[i].title);
			}

			text.setValue(getListId(this.newTask));
			this.newTask.parent = getListId(this.newTask);

			return text;
		});

		const buttonContainer = contentEl.createDiv({cls:"googleButtonContainer"});

		new Setting(buttonContainer).addButton((button) =>
			button.setButtonText("Update").onClick(async () => {
				this.close();
				// The Google Tasks API cannot move a task between lists with a PATCH,
				// so a list change has to be re-created in the target list and the
				// original deleted. Only delete once the copy exists.
				if (this.newTask.parent !== this.oldListId) {
					const created = await CreateGoogleTaskFromOldTask(
						this.plugin,
						this.newTask
					);
					if (created) {
						await DeleteGoogleTask(
							this.plugin,
							this.oldTaskSelfLInk,
							false
						);
						this.plugin.refreshScheduleViews();
					}
					return;
				}

				await UpdateGoogleTask(this.plugin, this.newTask);
			})
		);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
