import type GoogleTasksPlugin from "src/GoogleTasksPlugin";

import { createNotice } from "src/helper/NoticeHelper";
import type { Task } from "src/helper/types";
import { getGoogleAuthToken } from "./GoogleAuth";

export async function UpdateGoogleTask(
	plugin: GoogleTasksPlugin,
	task: Task
): Promise<boolean> {

	const requestHeaders: HeadersInit = new Headers();
	requestHeaders.append(
		"Authorization",
		"Bearer " + (await getGoogleAuthToken(plugin))
	);
	requestHeaders.append("Content-Type", "application/json");


	try {
		const response = await fetch(
			`${task.selfLink}`,
			{
				method: "PATCH",
				headers: requestHeaders,
				body: JSON.stringify({
                    "title":task.title,
                    "notes": task.notes ?? "",
                    // The Google Tasks API only accepts an RFC 3339 timestamp for `due`;
                    // a bare "YYYY-MM-DD" (what the date input yields) is silently ignored.
                    "due": task.due ? new Date(task.due).toISOString() : null,
                    "updated": new Date().toISOString()
                }),
			}
		);

        if (response.status == 200) {
            createNotice(plugin, "Task updated");
            await response.json();

            plugin.refreshScheduleViews();
        }

	} catch (error) {
        console.log(error)
		createNotice(plugin, "Could not update task");
		return false;
	}



	return true;
}
