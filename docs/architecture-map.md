# todo-extension — Architecture Map

Waiveo community extension for task/TODO list management. Also the canonical reference implementation of the "Option 3" pattern (custom UI + full backend API).

## Entry points

| File | Purpose |
|---|---|
| `server/index.js` (~653 lines) | Backend — CRUD, stats, automation actions, lifecycle hooks |
| `frontend-routes/todos/list/+page.svelte` (~412 lines) | UI — task list, stats, create/edit modals |
| `extension.json` | Manifest — v1.2.6, community, requires `design-system`, provides `task-management` + `todo-list` |
| `api.json` | API route declarations |
| `navigation.json` | Sidebar entry ("My Tasks", order 1) |
| `automation.json` | 3 triggers + 5 actions |

## Major modules

### server/index.js
- CRUD handlers for `todo_items` model.
- Stats endpoint (totals by completion state).
- Automation dropdown data (pending, all).
- Event emitters: `todo-created`, `todo-completed` via `api.emit()`.
- Automation action dispatch via `api.executeAction()`.
- Lifecycle: `onInstall()`, `init()`, `onEnable()`, `onDisable()`, `onUninstall()`.

### frontend-routes/todos/list/+page.svelte
Jewel Design system components: `JewelPage`, `Card`, `Button`, `Badge`, `Modal`, `EmptyState`, toasts. Fetches via extension API routes.

## Data flow

```
UI form submit → POST /api/extensions/todo-extension/todos
  → server creates row in todo_items (via api.model('todos'))
  → api.emit('todo-created', payload)
  → automation TriggerManager evaluates matching rules
  → matching actions dispatched via api.executeAction
```

## External integrations

- **Waiveo platform API** (`api.registerModel`, `api.registerRoute`, `api.emit`, `api.on`, `api.logEvent`, `api.executeAction`).
- **Jewel Design system** — UI components.
- **Automation engine** — triggers fire on `todo-created`, `todo-completed`, `todo-overdue`.

## API surface

All routes under `/api/extensions/todo-extension/`:
- `GET /todos` — list (ORDER BY created_at DESC)
- `GET /todos/:id` — single
- `POST /todos` — create (title required)
- `PUT /todos/:id` — update (title, description, completed)
- `DELETE /todos/:id`
- `GET /stats` — { total, completed, pending }
- `GET /automation/todos/pending` — for automation dropdowns
- `GET /automation/todos/all`

## Automation

Triggers: `todo_created`, `todo_completed`, `todo_overdue`.

Actions: `create_todo`, `complete_todo`, `delete_old_todos`, `update_todo_priority`, `send_todo_report`.

## Database

Model: `todo_items`
- Columns: `id`, `title`, `description`, `completed` (boolean), `priority` (TEXT), `due_date` (TEXT ISO-8601), `created_at`, `updated_at`.
- Indexes: `idx_todo_items_completed`, `idx_todo_items_created_at`, `idx_todo_items_due_date`.

## Dependencies

None in `package.json` — zero runtime deps. Pure platform-API consumer.

## Common debugging paths

- **TODO not appearing after create** → Check POST response for the created row's ID; confirm model registration via `api.registerModel('todos', schema)` ran during `onInstall()`.
- **Automation not firing on `todo_completed`** → Trigger uses event emitted by `api.emit('todo-completed', …)`. Grep `server/index.js` for the emit call to confirm it's reached when `completed` flips to true.
- **Stats wrong** → Stats endpoint is a simple SQL aggregate. If numbers don't match UI, the UI may be caching — check `svelte-query` invalidation on mutation.
- **UI blank** → Extension manifest requires `design-system`. If its deployment is missing, the Svelte components won't resolve.

## Deployment

```bash
cd /Users/matt/waiveo/waiveo && ./scripts/cli/deploy-cli.sh extension todo-extension
```

## Role as reference implementation

todo-extension is the canonical demonstration of the full Waiveo extension pattern: custom UI route + backend API + model + automation triggers/actions + lifecycle hooks, all using only the public platform API. Clone its structure when scaffolding a new Option-3 extension.

## Cross-project boundaries

Canonical source: `waiveo/extensions/todo-extension/`. Workspace-root `todo-extension/` is a public mirror.
