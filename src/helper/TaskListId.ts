import type { Task } from "./types";

/**
 * A task only carries its list id inside `selfLink`
 * (https://www.googleapis.com/tasks/v1/lists/<listId>/tasks/<taskId>), so extract it
 * from there whenever a task has to be matched against a task list.
 */
export function getListId(task: Task): string {
	const selfLink = task.selfLink;

	const startIndex = "https://www.googleapis.com/tasks/v1/lists/".length;

	const endIndex = selfLink.indexOf("/", startIndex);

	return selfLink.substring(startIndex, endIndex);
}
