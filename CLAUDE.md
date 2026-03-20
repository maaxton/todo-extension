# TODO Extension — Claude Code Guide

## What Is This?

A Waiveo community extension providing task/TODO list management. Also serves as a reference implementation demonstrating the "Option 3" extension pattern (custom UI pages with full API).

**Requires:** `design-system` | **Provides:** `task-management`, `todo-list` | **Permissions:** `database`

## Project Structure

```
todo-extension/
├── extension.json          # Extension manifest (v1.2.6, type: community)
├── package.json            # No npm dependencies
├── README.md               # User documentation
├── api.json                # API route declarations
├── navigation.json         # Sidebar entry ("My Tasks", order 1)
├── automation.json         # 3 triggers + 2 actions
├── server/
│   └── index.js            # Backend (653 lines) — CRUD, stats, automation actions
└── frontend-routes/
    └── todos/
        └── list/
            └── +page.svelte  # UI (412 lines) — task list, stats, modals
```

## API Routes

All under `/api/extensions/todo-extension/`:

- `GET /todos` — List all todos (ordered by created_at DESC)
- `GET /todos/:id` — Get specific todo
- `POST /todos` — Create todo (title required)
- `PUT /todos/:id` — Update todo (title, description, completed)
- `DELETE /todos/:id` — Delete todo
- `GET /stats` — Statistics (total, completed, pending)
- `GET /automation/todos/pending` — Pending todos for automation dropdowns
- `GET /automation/todos/all` — All todos for automation

## Automation

**Triggers:** `todo_created`, `todo_completed`, `todo_overdue`

**Actions (5):** `create-todo`, `complete-todo`, `delete-old-todos`, `update-todo-priority`, `send-todo-report`

**Events emitted:** `todo-created`, `todo-completed` (via `api.emit()`)

## Database

**Model: `todo_items`** — `id`, `title`, `description`, `completed` (boolean), `created_at`, `updated_at`

**Indexes:** `idx_todo_items_completed`, `idx_todo_items_created_at`

## Key Waiveo API Usage

This extension demonstrates the standard patterns:
- `api.registerModel()` / `api.model('todos')` — Database via Model API
- `api.registerRoute()` — HTTP routes
- `api.emit()` / `api.on()` — Event system
- `api.logEvent()` — Event logging
- `api.executeAction()` — Automation action handlers
- Lifecycle: `onInstall()`, `init()`, `onEnable()`, `onDisable()`, `onUninstall()`

## Frontend

Uses Jewel Design system: `JewelPage`, `Card`, `Button`, `Badge`, `Modal`, `EmptyState`, `toasts`.

## Deployment

```bash
cd /Users/matt/waiveo/waiveo
./scripts/cli/deploy-cli.sh extension todo-extension
```

## Cross-Project Escalation

If you encounter a problem outside this project's boundary:
1. Write an issue file to `../issues/` following the workspace issue template (see workspace `CLAUDE.md` for format)
2. Set `source-project` to `todo-extension`
3. Set `assigned-project` if you know who owns it, otherwise `unassigned`
4. Include specific acceptance criteria so the fixing agent can verify without a round-trip
5. Always set severity — if `critical`, tell the user: "I've filed a critical cross-project issue — you may want to dispatch this from the workspace level."
6. Note the dependency in your current work and continue

## Check Assigned Issues

Before starting work, scan `../issues/` for files where `assigned-project` is `todo-extension` and `status` is `assigned` or `in-progress`. Mention any open issues to the user before proceeding with other work.
