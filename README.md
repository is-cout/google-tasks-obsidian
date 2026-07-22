# Obsidian Google Tasks

Manage your Google Tasks from inside Obsidian


# Please make sure to install the latest version of this plugin (at least 1.5.0) to prevent a potential corruption of your attachments (Sorry 🙇‍♂️) Thank you to @carlosrusso. 


## Features

-   Tasks Schedule view — agenda of tasks bucketed by day (Overdue / Today / Tomorrow / upcoming), with status dots and inline complete/edit
-   Pick which task lists a schedule view shows, and open several schedule views with different lists
-   Show or hide completed tasks per schedule view
-   Create tasks
-   Edit tasks (Will create a new task and delete the old one)
-   Mark as done / todo
-   Delete done tasks

> Working with specific time is not supported by the Google API :(

## Installation

-   Download google-tasks from the latest [release](https://github.com/YukiGasai/obsidian-google-tasks/releases/)
-   Extract zip into `.obsidian/plugins` folder
-   Restart Obsidian
-   Activate inside the obsidian settings page
-   [Create Google Cloud Project](https://console.cloud.google.com/projectcreate?)
-   [Activate Google Tasks API](https://console.cloud.google.com/marketplace/product/google/tasks.googleapis.com?q=search&referrer=search&project=iron-core-327018)
-   [Configure OAUTH screen](https://console.cloud.google.com/apis/credentials/consent?)
    -   Select Extern
    -   Fill necessary inputs
    -   Add your email as tester if using "@gmail" add gmail and googlemail
-   [Add API Token](https://console.cloud.google.com/apis/credentials)
-   [Add OAUTH client](https://console.cloud.google.com/apis/credentials/oauthclient)
    -   select Webclient
    -   add `http://127.0.0.1:42813` as Javascript origin
    -   add `http://127.0.0.1:42813/callback` as redirect URI
-   add the keys into the fields under the plugin settings
-   Press Login

### Using the plugin on Mobile (work around)

-   Login on a desktop device
-   Use the `Copy Google Refresh Token to Clipboard` command on that device
-   Install the plugin on the phone
-   Instead of `Login` paste the token from the desktop device into the Refresh token field on the phone

## Usage

### Tasks Schedule View

-   Open view by pressing the checkmark icon in the left sidebar, or with the `Open Tasks Schedule View` command
-   Tasks are grouped by day: Overdue, Today, Tomorrow, upcoming days, No due date
    -   Complete (or reopen) a task by clicking the checkbox
    -   Edit a task by clicking it
    -   Force update by clicking the date heading
    -   The view checks for changes in a set interval (changeable in settings)
-   Toolbar in the top-right corner:
    -   Checklist — show or hide completed tasks (accent-colored while they are shown)
    -   Gear — choose which task lists this view shows (no selection = all lists)
    -   Eye — collapse the weekday/date heading
-   List choice and the completed toggle are saved per view, so you can open several
    schedule views side by side, each on its own task lists. Open an extra one with
    the `Open New Tasks Schedule View` command, or Ctrl/Cmd-click the ribbon icon

### Commands

#### List Google Tasks

Shows a list of all undone tasks selecting one will complete the task

#### Create Google Tasks

Will open a popup to create a new task

#### Insert Google Tasks

Will insert a lost of all undone tasks into the current file. Checking the task inside the File will complete / incomplete it.
