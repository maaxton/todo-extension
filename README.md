# TODO Extension v1.1.0

> **NOTE: This is an SDK v1 mirror.**
>
> This repository contains the SDK v1 version of the TODO extension. The canonical, actively maintained version is at `waiveo/extensions/todo/` and uses the SDK v2 API (`ctx.*`). The two codebases have different initialization patterns and database access approaches.
>
> - **Canonical (SDK v2, maintained):** `waiveo/extensions/todo/`
> - **This mirror (SDK v1, legacy):** uses `api.*` and the older extension pattern
>
> Do not submit PRs to this mirror expecting them to be applied to the canonical. File issues against the canonical instead.

A simple TODO list extension that demonstrates extension development for Waiveo with full automation support.

## Features

- Create, read, update, and delete TODO items
- Mark items as completed
- View statistics (total, completed, pending)
- Full database integration
- RESTful API endpoints
- **NEW: Complete automation integration with triggers and actions**

## Installation

### From Zip

1. Package the extension:
   ```bash
   cd examples/todo-extension
   zip -r todo-extension.zip .
   ```

2. Upload `todo-extension.zip` through the Extension Manager UI

### From Git

If you've pushed this extension to a Git repository, install via the Extension Manager UI using the Git URL.

## API Endpoints

All endpoints are prefixed with `/api/extensions/todo-extension`

### List all todos
```bash
GET /todos

Response:
{
  "todos": [
    {
      "id": 1,
      "title": "Example todo",
      "description": "Description here",
      "completed": false,
      "created_at": "2025-10-14T12:00:00Z",
      "updated_at": "2025-10-14T12:00:00Z"
    }
  ],
  "count": 1
}
```

### Get specific todo
```bash
GET /todos/:id

Response:
{
  "id": 1,
  "title": "Example todo",
  "description": "Description here",
  "completed": false,
  "created_at": "2025-10-14T12:00:00Z",
  "updated_at": "2025-10-14T12:00:00Z"
}
```

### Create todo
```bash
POST /todos
Content-Type: application/json

{
  "title": "New todo",
  "description": "Optional description"
}

Response:
{
  "success": true,
  "todo": {
    "id": 2,
    "title": "New todo",
    "description": "Optional description",
    "completed": false,
    "created_at": "2025-10-14T12:00:00Z",
    "updated_at": "2025-10-14T12:00:00Z"
  }
}
```

### Update todo
```bash
PUT /todos/:id
Content-Type: application/json

{
  "title": "Updated title",
  "completed": true
}

Response:
{
  "success": true,
  "todo": {
    "id": 1,
    "title": "Updated title",
    "description": "Description here",
    "completed": true,
    "created_at": "2025-10-14T12:00:00Z",
    "updated_at": "2025-10-14T12:30:00Z"
  }
}
```

### Delete todo
```bash
DELETE /todos/:id

Response:
{
  "success": true,
  "deleted": {
    "id": 1,
    "title": "Example todo",
    ...
  }
}
```

### Get statistics
```bash
GET /stats

Response:
{
  "total": 10,
  "completed": 3,
  "pending": 7
}
```

## Automation Support (v1.1.0)

The TODO extension now fully integrates with the Welcome Relay automation system, providing powerful triggers and actions for todo management.

### Available Triggers

1. **Todo is created** - Fires when a new todo is added
   - Outputs: todoId, title, description, timestamp

2. **Todo is completed** - Fires when a todo is marked as complete
   - Outputs: todoId, title, completedAt

3. **Todo becomes overdue** - Scheduled check for overdue items
   - Config: Check interval (minutes)
   - Outputs: todoId, title, dueDate, daysOverdue

4. **Daily todo summary time** - Scheduled daily summary trigger
   - Config: Summary time (e.g., 09:00)
   - Outputs: totalTodos, completedToday, pending, overdue

### Available Actions

1. **Create a todo** - Create new todo items via automation
   - Inputs: title, description, priority, dueDate
   
2. **Complete a todo** - Mark todos as complete automatically
   - Inputs: todoId (searchable list), notes
   
3. **Delete old completed todos** - Clean up old completed items
   - Inputs: daysOld, confirmDelete
   
4. **Update todo priority** - Change priority levels
   - Inputs: todoId (searchable list), priority
   
5. **Send todo status report** - Generate reports in text/HTML/JSON
   - Inputs: reportType, format

### Example Automation Scenarios

- **Daily Cleanup**: Every day at midnight, delete todos completed more than 30 days ago
- **Morning Report**: Every morning at 9 AM, generate and send a todo summary report
- **Device Maintenance**: When a device goes offline, create a todo to check it
- **Backup Reminder**: When a backup completes, create a todo to verify it worked
- **Smart Completion**: When specific events occur, automatically complete related todos

### Automation API Endpoints

- `GET /api/extensions/todo-extension/automation/todos/pending` - Get pending todos for automation
- `GET /api/extensions/todo-extension/automation/todos/all` - Get all todos for automation

## Usage Examples

### Using cURL

```bash
# Create a todo
curl -X POST http://localhost:3001/api/extensions/todo-extension/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread"}'

# List all todos
curl http://localhost:3001/api/extensions/todo-extension/todos

# Mark as completed
curl -X PUT http://localhost:3001/api/extensions/todo-extension/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Get statistics
curl http://localhost:3001/api/extensions/todo-extension/stats

# Delete a todo
curl -X DELETE http://localhost:3001/api/extensions/todo-extension/todos/1
```

### Using JavaScript

```javascript
// Create todo
const response = await fetch('/api/extensions/todo-extension/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Buy groceries',
    description: 'Milk, eggs, bread'
  })
});
const data = await response.json();
console.log(data.todo);

// List todos
const todos = await fetch('/api/extensions/todo-extension/todos')
  .then(res => res.json());
console.log(todos);
```

## Database Schema

The extension creates the following table:

```sql
CREATE TABLE todo_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

This extension demonstrates:

- Database table creation in `onInstall`
- RESTful API routes
- Input validation
- Error handling
- Event logging
- Proper cleanup in `onUninstall`

Use this as a template for your own extensions!

## License

MIT


